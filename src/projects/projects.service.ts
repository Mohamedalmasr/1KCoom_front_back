import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  Repository,
  In,
  ILike,
} from 'typeorm';
import { Project } from './entities/project.entity';
import { Task } from './entities/task.entity';
import { ProjectMember } from './entities/project-member.entity';
import { TaskAssignment } from './entities/task-assignment.entity';
import { User } from './entities/user.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

const PriorityMap: Record<'High' | 'Medium' | 'Low', number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly ds: DataSource,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(ProjectMember) private readonly pmRepo: Repository<ProjectMember>,
    @InjectRepository(TaskAssignment) private readonly taRepo: Repository<TaskAssignment>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  /* ================= Create Project ================= */
  async createProject(dto: CreateProjectDto) {
    const exists = await this.projectRepo.findOne({ where: { projectCode: dto.projectCode } });
    if (exists) throw new BadRequestException('ProjectCode already exists');

    const memberSet = new Set<number>((dto.members || []).map(Number));
    if (dto.leaderAID) memberSet.add(dto.leaderAID);
    const members = Array.from(memberSet);

    await this.ensureUsersExist(members);

    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const project = qr.manager.create(Project, {
        projectCode: dto.projectCode,
        name: dto.name,
        projectDesc: dto.projectDesc ?? null,
        leaderAID: dto.leaderAID ?? null,
        type: dto.type,
        startDate: dto.startDate ?? null,
        dueDate: dto.dueDate ?? null,
        budget: (dto.budget ?? 0).toFixed(2),
        status: dto.status || 'On Track',
        recSts: '1',
      });
      const savedProject = await qr.manager.save(Project, project);

      if (members.length) {
        const pmRows = members.map((u) =>
          qr.manager.create(ProjectMember, {
            projectAID: savedProject.projectAID,
            usersAID: u,
            role: null,
          }),
        );
        await qr.manager.save(ProjectMember, pmRows);
      }

      const taskRows = (dto.tasks || []).map((t, i) =>
        qr.manager.create(Task, {
          taskCode: this.taskCode(savedProject.projectCode, i + 1),
          name: t.title,
          taskDesc: t.subject,
          projectFK: savedProject.projectAID,
          hoursEst: Math.max(0, Math.trunc(Number(t.estimatedHours || 0))),
          taskSts: 0,
          taskPriority: PriorityMap[t.priority],
          recSts: '1',
        }),
      );
      const savedTasks = await qr.manager.save(Task, taskRows);

      if (members.length && savedTasks.length) {
        const assignRows = savedTasks.flatMap((tsk) =>
          members.map((uid) => ({
            taskAID: tsk.taskAID,
            usersAID: uid,
            role: null,
          })),
        );
        await qr.manager
          .createQueryBuilder()
          .insert()
          .into(TaskAssignment)
          .values(assignRows)
          .orIgnore()
          .execute();
      }

      await qr.commitTransaction();
      return {
        projectAID: savedProject.projectAID,
        projectCode: savedProject.projectCode,
        membersAdded: members.length,
        tasksCreated: savedTasks.length,
      };
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  /* ================= Update/Delete Project ================= */
  async updateProject(projectAID: number, dto: UpdateProjectDto) {
    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const project = await qr.manager.findOne(Project, { where: { projectAID } });
      if (!project) throw new NotFoundException('Project not found');

      if (dto.projectCode !== undefined) {
        const exists = await qr.manager.findOne(Project, { where: { projectCode: dto.projectCode } });
        if (exists && exists.projectAID !== projectAID) {
          throw new BadRequestException('ProjectCode already exists');
        }
        project.projectCode = dto.projectCode;
      }
      if (dto.name !== undefined) project.name = dto.name;
      if (dto.projectDesc !== undefined) project.projectDesc = dto.projectDesc ?? null;
      if (dto.leaderAID !== undefined) project.leaderAID = dto.leaderAID ?? null;
      if (dto.type !== undefined) project.type = dto.type;
      if (dto.startDate !== undefined) project.startDate = dto.startDate ?? null;
      if (dto.dueDate !== undefined) project.dueDate = dto.dueDate ?? null;
      if (dto.budget !== undefined) project.budget = (dto.budget ?? 0).toFixed(2);
      if (dto.status !== undefined) project.status = dto.status;

      if (dto.members) {
        const set = new Set<number>(dto.members.map(Number));
        if (dto.leaderAID) set.add(dto.leaderAID);
        const newMembers = Array.from(set);

        await this.ensureUsersExist(newMembers, qr);

        const current = await qr.manager.find(ProjectMember, { where: { projectAID } });
        const curIds = new Set(current.map((m) => m.usersAID));

        const toAdd = newMembers.filter((id) => !curIds.has(id));
        const toRemove = [...curIds].filter((id) => !set.has(id));

        if (toAdd.length) {
          const rows = toAdd.map((uid) =>
            qr.manager.create(ProjectMember, { projectAID, usersAID: uid, role: null }),
          );
          await qr.manager.save(ProjectMember, rows);

          const taskIds = await this.getProjectTaskIds(qr, projectAID);
          if (taskIds.length) {
            const assigns = taskIds.flatMap((tid) =>
              toAdd.map((uid) => ({ taskAID: tid, usersAID: uid, role: null })),
            );
            await qr.manager
              .createQueryBuilder()
              .insert()
              .into(TaskAssignment)
              .values(assigns)
              .orIgnore()
              .execute();
          }
        }

        if (toRemove.length) {
          await qr.manager.delete(ProjectMember, { projectAID, usersAID: In(toRemove) });
          const taskIds = await this.getProjectTaskIds(qr, projectAID);
          if (taskIds.length) {
            await qr.manager
              .createQueryBuilder()
              .delete()
              .from(TaskAssignment)
              .where('"TaskAID" IN (:...tids) AND "UsersAID" IN (:...uids)', {
                tids: taskIds, uids: toRemove,
              })
              .execute();
          }
        }
      }

      await qr.manager.save(Project, project);
      await qr.commitTransaction();
      return { ok: true, projectAID };
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  async deleteProject(projectAID: number) {
    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const project = await qr.manager.findOne(Project, { where: { projectAID } });
      if (!project) throw new NotFoundException('Project not found');

      const taskIds = await this.getProjectTaskIds(qr, projectAID);
      if (taskIds.length) {
        await qr.manager
          .createQueryBuilder()
          .delete()
          .from(TaskAssignment)
          .where('"TaskAID" IN (:...tids)', { tids: taskIds })
          .execute();
      }

      await qr.manager.delete(Task, { projectFK: projectAID });
      await qr.manager.delete(ProjectMember, { projectAID });
      await qr.manager.delete(Project, { projectAID });

      await qr.commitTransaction();
      return;
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  /* ================= Tasks CRUD ================= */
  async createTask(projectAID: number, dto: UpdateTaskDto) {
    if (!dto.title?.trim() || !dto.subject?.trim()) {
      throw new BadRequestException('title and subject are required');
    }

    const project = await this.projectRepo
      .createQueryBuilder('p')
      .select(['p.projectAID', 'p.projectCode'])
      .where('p."ProjectAID" = :id', { id: projectAID })
      .getOne();
    if (!project) throw new NotFoundException('Project not found');

    const task = this.taskRepo.create({
      taskCode: this.taskCode(project.projectCode, Date.now() % 1000),
      name: dto.title.trim(),
      taskDesc: dto.subject.trim(),
      projectFK: projectAID,
      hoursEst: dto.estimatedHours != null ? Math.max(0, Math.trunc(dto.estimatedHours)) : 0,
      taskPriority: dto.priority ? PriorityMap[dto.priority] : 2,
      taskSts: dto.taskSts ?? 0,
      dateStrt: dto.dateStrt ?? null,
      dateDue: dto.dateDue ?? null,
      dateEnd: dto.dateEnd ?? null,
      recSts: '1',
    });
    const saved = await this.taskRepo.save(task);

    const members = await this.pmRepo.find({ where: { projectAID } });
    if (members.length) {
      const assigns = members.map((m) => ({ taskAID: saved.taskAID, usersAID: m.usersAID, role: null }));
      await this.ds
        .createQueryBuilder()
        .insert()
        .into(TaskAssignment)
        .values(assigns)
        .orIgnore()
        .execute();
    }

    return saved;
  }

  async createTaskByCode(projectCode: string, dto: UpdateTaskDto) {
    if (!dto.title?.trim() || !dto.subject?.trim()) {
      throw new BadRequestException('title and subject are required');
    }
    const project = await this.projectRepo.findOne({
      select: ['projectAID', 'projectCode'],
      where: { projectCode },
    });
    if (!project) throw new NotFoundException('Project not found');
    return this.createTask(project.projectAID, dto);
  }

  async updateTask(projectAID: number, taskAID: number, dto: UpdateTaskDto) {
    const task = await this.taskRepo.findOne({ where: { taskAID, projectFK: projectAID } });
    if (!task) throw new NotFoundException('Task not found');

    if (dto.title !== undefined) task.name = dto.title.trim();
    if (dto.subject !== undefined) task.taskDesc = dto.subject ?? null;
    if (dto.estimatedHours !== undefined) task.hoursEst = Math.max(0, Math.trunc(dto.estimatedHours));
    if (dto.priority !== undefined) task.taskPriority = PriorityMap[dto.priority];
    if (dto.taskSts !== undefined) task.taskSts = dto.taskSts;
    if (dto.dateStrt !== undefined) task.dateStrt = dto.dateStrt ?? null;
    if (dto.dateDue !== undefined) task.dateDue = dto.dateDue ?? null;
    if (dto.dateEnd !== undefined) task.dateEnd = dto.dateEnd ?? null;

    await this.taskRepo.save(task);
    return { ok: true, taskAID };
  }

  async deleteTask(projectAID: number, taskAID: number) {
    const task = await this.taskRepo.findOne({ where: { taskAID, projectFK: projectAID } });
    if (!task) throw new NotFoundException('Task not found');

    await this.ds
      .createQueryBuilder()
      .delete()
      .from(TaskAssignment)
      .where('"TaskAID" = :tid', { tid: taskAID })
      .execute();

    await this.taskRepo.delete({ taskAID });
    return;
  }

  /* ================= Assignees ================= */
  private async assertTaskUnderProject(projectAID: number, taskAID: number) {
    const task = await this.taskRepo.findOne({ where: { taskAID, projectFK: projectAID } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private async ensureUsersAreProjectMembers(projectAID: number, users: number[]) {
    if (!users.length) return;
    const rows = await this.pmRepo.find({ where: { projectAID, usersAID: In(users) } });
    const have = new Set(rows.map(r => r.usersAID));
    const missing = users.filter(u => !have.has(u));
    if (missing.length) {
      throw new BadRequestException(`Users are not members of the project: ${missing.join(', ')}`);
    }
  }

  async addTaskAssignees(projectAID: number, taskAID: number, dto: { users: number[]; role?: string }) {
    await this.assertTaskUnderProject(projectAID, taskAID);

    const unique = Array.from(new Set((dto.users || []).map(Number)));
    if (!unique.length) throw new BadRequestException('users is required and must be a non-empty array');

    await this.ensureUsersExist(unique);
    await this.ensureUsersAreProjectMembers(projectAID, unique);

    const existing = await this.taRepo.find({ where: { taskAID, usersAID: In(unique) } });
    const existingSet = new Set(existing.map(a => a.usersAID));
    const toInsert = unique.filter(u => !existingSet.has(u));

    if (toInsert.length) {
      await this.ds
        .createQueryBuilder()
        .insert()
        .into(TaskAssignment)
        .values(toInsert.map(u => ({ taskAID, usersAID: u, role: dto.role ?? null })))
        .orIgnore()
        .execute();
    }

    return { added: toInsert.length, alreadyAssigned: existingSet.size };
  }

  async removeTaskAssignee(projectAID: number, taskAID: number, userAID: number) {
    await this.assertTaskUnderProject(projectAID, taskAID);
    await this.ds
      .createQueryBuilder()
      .delete()
      .from(TaskAssignment)
      .where('"TaskAID" = :tid AND "UsersAID" = :uid', { tid: taskAID, uid: userAID })
      .execute();
    return;
  }

  async claimTask(projectAID: number, taskAID: number, dto: { userAID?: number; role?: string; exclusive?: boolean }) {
    const userId = Number(dto.userAID);
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userAID is required to claim task');
    }
    const task = await this.assertTaskUnderProject(projectAID, taskAID);
    await this.ensureUsersExist([userId]);
    await this.ensureUsersAreProjectMembers(projectAID, [userId]);

    const exists = await this.taRepo.findOne({ where: { taskAID: task.taskAID, usersAID: userId } });
    if (!exists) {
      await this.ds
        .createQueryBuilder()
        .insert()
        .into(TaskAssignment)
        .values({ taskAID: task.taskAID, usersAID: userId, role: dto.role ?? null })
        .orIgnore()
        .execute();
    }

    if (dto.exclusive !== false) {
      await this.ds
        .createQueryBuilder()
        .delete()
        .from(TaskAssignment)
        .where('"TaskAID" = :tid AND "UsersAID" <> :uid', { tid: task.taskAID, uid: userId })
        .execute();
    }

    return { ok: true, taskAID: task.taskAID, userAID: userId };
  }

  /* ================= Queries ================= */
  async getProjectDetail(projectAID: number) {
    const project = await this.projectRepo.findOne({ where: { projectAID } });
    if (!project) throw new NotFoundException('Project not found');

    const tasks = await this.taskRepo.find({
      where: { projectFK: projectAID },
      order: { taskAID: 'ASC' as const },
    });

    const members = await this.pmRepo.find({ where: { projectAID } });
    const memberIds = members.map((m) => m.usersAID);
    const users = memberIds.length
      ? await this.userRepo.find({ where: { usersAID: In(memberIds) } })
      : [];
    const usersById = new Map(users.map((u) => [u.usersAID, u]));
    const membersWithUser = members.map((m) => ({
      projectAID: m.projectAID,
      usersAID: m.usersAID,
      role: m.role ?? null,
      assignedAt: m.assignedAt,
      user: usersById.get(m.usersAID) ?? null,
    }));

    return { project, members: membersWithUser, tasks };
  }

  // ✅ لستة المشاريع مع limit/offset + team + issuesCount
  async listProjects(params: { q?: string; skip?: number; take?: number; limit?: number; offset?: number }) {
    const limit = Math.min(200, Math.max(1, Number(params.limit ?? params.take ?? 20)));
    const offset = Math.max(0, Number(params.offset ?? params.skip ?? 0));
    const q = params.q?.trim();

    // فلترة بسيطة بالاسم/الكود
    const where = q
      ? [
          { name: ILike(`%${q}%`) },
          { projectCode: ILike(`%${q}%`) },
        ]
      : undefined;

    const [rows, total] = await this.projectRepo.findAndCount({
      where: where as any,
      order: { projectAID: 'DESC' as const },
      skip: offset,
      take: limit,
    });

    const projIds = rows.map((r) => r.projectAID);

    // members -> users (بالـTypeORM)
    const pmRows = projIds.length
      ? await this.pmRepo.createQueryBuilder('pm')
          .where('pm.projectAID IN (:...ids)', { ids: projIds })
          .getMany()
      : [];

    const userIds = Array.from(new Set(pmRows.map((m) => m.usersAID)));
    const userRows = userIds.length
      ? await this.userRepo.createQueryBuilder('u')
          .where('u.usersAID IN (:...uids)', { uids: userIds })
          .getMany()
      : [];

    const userMap = new Map<number, User>(userRows.map((u) => [u.usersAID, u]));
    const membersByProject = new Map<number, { user: { fullName: string; email: string } }[]>();
    for (const pm of pmRows) {
      const u = userMap.get(pm.usersAID);
      const full = `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || u?.email || '';
      const arr = membersByProject.get(pm.projectAID) ?? [];
      arr.push({ user: { fullName: full, email: u?.email ?? '' } });
      membersByProject.set(pm.projectAID, arr);
    }

    // issuesCount = عدد التسكات لكل مشروع
    const taskCounts = projIds.length
      ? await this.taskRepo.createQueryBuilder('t')
          .select('t.projectFK', 'projectAID')
          .addSelect('COUNT(*)', 'cnt')
          .where('t.projectFK IN (:...ids)', { ids: projIds })
          .groupBy('t.projectFK')
          .getRawMany<{ projectAID: number; cnt: string }>()
      : [];
    const countMap = new Map<number, number>(
      taskCounts.map((r) => [Number(r.projectAID), Number(r.cnt)]),
    );

    const items = rows.map((p) => ({
      // الحقول الأساسية (الفرونت يقدر يقرأها مباشرة)
      projectAID: p.projectAID,
      projectCode: p.projectCode,
      name: p.name,
      projectDesc: p.projectDesc,
      dueDate: p.dueDate,
      status: p.status,
      // للفرونت: members -> team names, issuesCount
      members: membersByProject.get(p.projectAID) ?? [],
      issuesCount: countMap.get(p.projectAID) ?? 0,
    }));

    return { items, total, limit, offset };
  }

  /* ================= helpers ================= */
  private taskCode(projectCode: string, n: number) {
    return `${projectCode}-${String(n).padStart(3, '0')}`.slice(0, 16);
  }

  private async ensureUsersExist(ids: number[], qr?: ReturnType<DataSource['createQueryRunner']>) {
    if (!ids.length) return;
    const repo = qr ? qr.manager.getRepository(User) : this.userRepo;
    const found = await repo.find({ where: { usersAID: In(ids) } });
    const set = new Set(found.map((u) => u.usersAID));
    const missing = ids.filter((x) => !set.has(x));
    if (missing.length) {
      throw new BadRequestException(`UsersAID not found in tc_users: ${missing.join(', ')}`);
    }
  }

  private async getProjectTaskIds(qr: ReturnType<DataSource['createQueryRunner']>, projectAID: number) {
    const tasks = await qr.manager.find(Task, {
      select: ['taskAID'],
      where: { projectFK: projectAID },
    });
    return tasks.map((t) => t.taskAID);
  }
}
