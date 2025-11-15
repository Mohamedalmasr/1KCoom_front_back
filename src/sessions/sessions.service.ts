import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly repo: Repository<Session>,
  ) {}

  private toDate(value: string | Date): Date {
    return value instanceof Date ? value : new Date(value);
  }

  async create(dto: CreateSessionDto): Promise<Session> {
    const start = this.toDate(dto.startTime);
    const end = this.toDate(dto.endTime);

    const entity = this.repo.create({
      taskAID: dto.taskId,
      usersAID: dto.userId,
      startTime: start,
      endTime: end,
      durationMs: Math.max(dto.durationMs, 0),
      note: dto.note ?? null,
    });

    return this.repo.save(entity);
  }

  findAll(): Promise<Session[]> {
    return this.repo.find({
      order: { createdAt: 'DESC' },
    });
  }

  findByTask(taskId: number): Promise<Session[]> {
    return this.repo.find({
      where: { taskAID: taskId },
      order: { startTime: 'ASC' },
    });
  }

  findByUser(userId: number): Promise<Session[]> {
    return this.repo.find({
      where: { usersAID: userId },
      order: { startTime: 'DESC' },
    });
  }

  findForTask(taskAID: number, usersAID?: number): Promise<Session[]> {
    if (typeof usersAID === 'number' && !Number.isNaN(usersAID)) {
      return this.repo.find({
        where: { taskAID, usersAID },
        order: { startTime: 'ASC' },
      });
    }
    return this.findByTask(taskAID);
  }

  findOne(id: number): Promise<Session | null> {
    return this.repo.findOne({ where: { sessionAID: id } });
  }

  async update(id: number, dto: UpdateSessionDto): Promise<Session> {
    const session = await this.findOne(id);
    if (!session) {
      throw new Error('Session not found');
    }

    if (dto.taskId !== undefined) {
      session.taskAID = dto.taskId;
    }
    if (dto.userId !== undefined) {
      session.usersAID = dto.userId;
    }
    if (dto.startTime) {
      session.startTime = this.toDate(dto.startTime);
    }
    if (dto.endTime) {
      session.endTime = this.toDate(dto.endTime);
    }

    if (dto.durationMs !== undefined) {
      session.durationMs = Math.max(dto.durationMs, 0);
    } else if (dto.startTime || dto.endTime) {
      const startMs = session.startTime.getTime();
      const endMs = session.endTime.getTime();
      session.durationMs = Math.max(endMs - startMs, 0);
    }

    if (dto.note !== undefined) {
      session.note = dto.note ?? null;
    }

    return this.repo.save(session);
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete({ sessionAID: id });
  }

  async summaryForTask(taskAID: number) {
    const qb = this.repo
      .createQueryBuilder('s')
      .select('s.usersAID', 'usersAID')
      .addSelect('SUM(CAST(s."DurationMs" as bigint))', 'totalMs')
      .addSelect('COUNT(*)', 'sessionsCount')
      .where('s.taskAID = :taskAID', { taskAID })
      .groupBy('s.usersAID')
      .orderBy('totalMs', 'DESC');

    const rows = await qb.getRawMany<{
      usersAID: number;
      totalMs: string;
      sessionsCount: string;
    }>();

    return rows.map((r) => ({
      usersAID: Number(r.usersAID),
      totalMs: Number(r.totalMs),
      sessionsCount: Number(r.sessionsCount),
    }));
  }
}
