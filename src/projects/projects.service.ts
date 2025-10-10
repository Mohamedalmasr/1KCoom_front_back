import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateProjectDto, CreateTaskDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  private taskProjectColumn?: string;
  private taskTableMeta?: Record<string, { nullable: boolean; hasDefault: boolean }>;

  constructor(private readonly ds: DataSource) {}

  async create(dto: CreateProjectDto) {
    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const ins = await qr.query(
        `INSERT INTO public."tP_Project"("ProjectCode","ProjectName","ProjectDesc","RecSts")
         VALUES($1,$2,$3,'1')
         RETURNING "ProjeciAID" AS "projectAID"`,
        [dto.projectCode ?? null, dto.name, dto.projectDesc ?? null],
      );
      const projectAID: number = ins[0].projectAID;

      await qr.query(
        `INSERT INTO public."tP_ProjectMeta"("ProjectAID","LeaderAID","Type","StartDate","DueDate","Budget","Status")
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [
          projectAID,
          dto.leaderAID ?? null,
          dto.type ?? null,
          dto.startDate ?? null,
          dto.dueDate ?? null,
          dto.budget ?? 0,
          dto.status ?? 'On Track',
        ],
      );

      if (dto.members?.length) {
        const values = dto.members.map((_, i) => `($1,$${i + 2})`).join(',');
        await qr.query(
          `INSERT INTO public."tP_ProjectMember"("ProjectAID","UsersAID")
           VALUES ${values}
           ON CONFLICT ("ProjectAID","UsersAID") DO NOTHING`,
          [projectAID, ...dto.members],
        );
      }

      if (dto.tasks?.length) {
        await this.insertTasksSmart(qr, projectAID, dto.tasks);
      }

      await qr.commitTransaction();
      return { projectAID, membersAdded: dto.members?.length || 0, tasksAdded: dto.tasks?.length || 0, message: 'Project created' };
    } catch (e) {
      await qr.rollbackTransaction();
      throw new BadRequestException(e?.detail || e?.message || 'Failed to create project');
    } finally {
      await qr.release();
    }
  }

  async list(params?: { status?: string; q?: string; limit?: number; offset?: number }) {
    const status = params?.status;
    const q = params?.q?.trim() ?? '';
    const limit = Math.min(100, Math.max(1, Number(params?.limit ?? 20)));
    const offset = Math.max(0, Number(params?.offset ?? 0));

    const args: any[] = [];
    let where = '';
    if (status) { args.push(status); where += (where ? ' AND ' : ' WHERE ') + `m."Status" = $${args.length}`; }
    if (q) { args.push(`%${q}%`, `%${q}%`); where += (where ? ' AND ' : ' WHERE ') + `(p."ProjectName" ILIKE $${args.length-1} OR p."ProjectDesc" ILIKE $${args.length})`; }

    const items = await this.ds.query(
      `SELECT p."ProjeciAID" AS "projectAID",
              p."ProjectName" AS "title",
              p."ProjectDesc" AS "description",
              m."DueDate"     AS "dueDate",
              m."Status"      AS "status"
       FROM public."tP_Project" p
       LEFT JOIN public."tP_ProjectMeta" m ON m."ProjectAID" = p."ProjeciAID"
       ${where}
       ORDER BY COALESCE(m."DueDate", '9999-12-31') ASC
       LIMIT ${limit} OFFSET ${offset}`,
      args,
    );

    for (const it of items) {
      const team = await this.ds.query(
        `SELECT (COALESCE(LEFT(u."FrstNme",1),'') || COALESCE(LEFT(u."LastNme",1),'')) AS ini
           FROM public."tP_ProjectMember" pm
           JOIN public.tc_users u ON u."UsersAID" = pm."UsersAID"
          WHERE pm."ProjectAID" = $1
          ORDER BY u."UsersAID" ASC`,
        [it.projectAID],
      );
      it.team = team.map((r: any) => r.ini);

      const taskProjectCol = await this.getTaskProjectColumn();
      const hasStatus = await this.tableHasColumn('tP_Task', 'Status');
      const [{ count }] = await this.ds.query(
        hasStatus
          ? `SELECT COUNT(*)::int AS count FROM public."tP_Task" WHERE "${taskProjectCol}"=$1 AND ("Status" IS DISTINCT FROM 'Done')`
          : `SELECT COUNT(*)::int AS count FROM public."tP_Task" WHERE "${taskProjectCol}"=$1`,
        [it.projectAID],
      );
      it.issuesCount = count;
    }

    const [{ total }] = await this.ds.query(
      `SELECT COUNT(*)::int AS total
         FROM public."tP_Project" p
         LEFT JOIN public."tP_ProjectMeta" m ON m."ProjectAID" = p."ProjeciAID"
         ${where}`,
      args,
    );

    return { items, total, limit, offset };
  }

  private async tableHasColumn(table: string, column: string): Promise<boolean> {
    const [{ exists }] = await this.ds.query(
      `SELECT EXISTS(
         SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name=$1 AND column_name=$2
       ) AS exists`,
      [table, column],
    );
    return !!exists;
  }

  private async insertTasksSmart(qr: any, projectAID: number, tasks: CreateTaskDto[]) {
    const taskMeta = await this.getTaskTableMeta();
    const projectCol = await this.getTaskProjectColumn();
    const titleCol = (await this.tableHasColumn('tP_Task', 'Title')) ? 'Title' : null;

    let fallbackTitleCol = titleCol;
    if (!fallbackTitleCol && await this.tableHasColumn('tP_Task', 'TaskName')) {
      fallbackTitleCol = 'TaskName';
    }
    if (!fallbackTitleCol && await this.tableHasColumn('tP_Task', 'Name')) {
      fallbackTitleCol = 'Name';
    }

    let subjectCol: string | null = null;
    if (await this.tableHasColumn('tP_Task', 'Subject')) {
      subjectCol = 'Subject';
    } else if (await this.tableHasColumn('tP_Task', 'TaskDesc')) {
      subjectCol = 'TaskDesc';
    }

    let hoursCol: string | null = null;
    if (await this.tableHasColumn('tP_Task', 'EstimatedHours')) {
      hoursCol = 'EstimatedHours';
    } else if (await this.tableHasColumn('tP_Task', 'HoursEst')) {
      hoursCol = 'HoursEst';
    }

    const priorityCol = (await this.tableHasColumn('tP_Task', 'Priority')) ? 'Priority' : null;
    if (!fallbackTitleCol) {
      for (const _ of tasks) {
        await qr.query(
          `INSERT INTO public."tP_Task"("${projectCol}") VALUES ($1)`,
          [projectAID],
        );
      }
      return;
    }

    const needsTaskId = !!taskMeta?.TaskAID && !taskMeta.TaskAID.nullable && !taskMeta.TaskAID.hasDefault;
    let nextTaskId = 0;
    if (needsTaskId) {
      const [{ max }] = await qr.query(
        `SELECT COALESCE(MAX("TaskAID"),0)::int AS max FROM public."tP_Task"`,
      );
      nextTaskId = Number(max ?? 0) + 1;
    }

    const cols: string[] = [];
    if (needsTaskId) cols.push(`"TaskAID"`);
    cols.push(`"${projectCol}"`, `"${fallbackTitleCol}"`);
    const valuesParts: string[] = [];
    const params: any[] = [];

    if (subjectCol) cols.push(`"${subjectCol}"`);
    if (hoursCol) cols.push(`"${hoursCol}"`);
    if (priorityCol) cols.push(`"${priorityCol}"`);

    tasks.forEach((t) => {
      const rowParams: any[] = [];
      if (needsTaskId) {
        rowParams.push(nextTaskId++);
      }
      rowParams.push(projectAID, t.title || 'Task');
      if (subjectCol) rowParams.push(t.subject ?? null);
      if (hoursCol) rowParams.push(
        t.estimatedHours !== undefined && t.estimatedHours !== null
          ? Number(t.estimatedHours)
          : 0,
      );
      if (priorityCol) rowParams.push(t.priority ?? 'Medium');

      const placeholders = rowParams.map((_, j) => `$${params.length + j + 1}`);
      params.push(...rowParams);
      valuesParts.push(`(${placeholders.join(',')})`);
    });

    const sql = `INSERT INTO public."tP_Task"(${cols.join(',')}) VALUES ${valuesParts.join(',')}`;
    await qr.query(sql, params);
  }

  private async getTaskProjectColumn(): Promise<string> {
    if (this.taskProjectColumn) return this.taskProjectColumn;

    const candidates = ['ProjectAID', 'ProjectFK', 'ProjAID'];
    for (const candidate of candidates) {
      if (await this.tableHasColumn('tP_Task', candidate)) {
        this.taskProjectColumn = candidate;
        return candidate;
      }
    }

    throw new BadRequestException('tP_Task table is missing a project foreign key column.');
  }

  private async getTaskTableMeta(): Promise<Record<string, { nullable: boolean; hasDefault: boolean }>> {
    if (this.taskTableMeta) return this.taskTableMeta;

    const rows = await this.ds.query(
      `SELECT column_name,
              (is_nullable = 'YES') AS nullable,
              (column_default IS NOT NULL) AS "hasDefault"
         FROM information_schema.columns
        WHERE table_schema='public' AND table_name='tP_Task'`,
    );

    this.taskTableMeta = rows.reduce((acc: Record<string, { nullable: boolean; hasDefault: boolean }>, row: any) => {
      acc[row.column_name] = {
        nullable: row.nullable === true || row.nullable === 't',
        hasDefault: row.hasDefault === true || row.hasDefault === 't',
      };
      return acc;
    }, {});

    return this.taskTableMeta;
  }
}
