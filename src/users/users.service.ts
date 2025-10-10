import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  recSts: number;
  firstName?: string;
  lastName?: string;
  passwordCode?: string;
  passwordCodeDate?: Date;
}

type FindAllOpts = {
  page?: number;
  limit?: number;
  includeInactive?: boolean;
  search?: string;
  sort?: string; // e.g. "id:asc"
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  // ============ CREATE ============
  async create(dto: CreateUserDto): Promise<User> {
    const email = this.normalizeEmail(dto.email);
    const exists = await this.findByEmail(email);
    if (exists) throw new ConflictException('Email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const entity = this.usersRepository.create({
      email,
      passwordHash,
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      // recSts default 1 from entity
      // no passwordCode/passwordCodeDate since email verification disabled
    });

    const saved = await this.usersRepository.save(entity);
    return this.mapEntityToUser(saved);
  }

  // ============ LIST ============
  async findAll(opts: FindAllOpts = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));

    const qb = this.usersRepository.createQueryBuilder('u');

    if (!opts.includeInactive) {
      qb.andWhere('u.recSts = :recSts', { recSts: 1 });
    }

    if (opts.search?.trim()) {
      const s = `%${opts.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(u.email) LIKE :s OR LOWER(u.firstName) LIKE :s OR LOWER(u.lastName) LIKE :s)',
        { s },
      );
    }

    const sort = this.normalizeSort(opts.sort);
    qb.orderBy(sort.column, sort.direction).skip((page - 1) * limit).take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map((e) => this.mapEntityToUser(e)),
      page,
      limit,
      total,
    };
  }

  // ============ ONE ============
  async findOneById(id: number, includeInactive = false): Promise<User> {
    const where: any = { id };
    if (!includeInactive) where.recSts = 1;

    const entity = await this.usersRepository.findOne({ where });
    if (!entity) throw new NotFoundException('User not found');

    return this.mapEntityToUser(entity);
  }

  // ============ UPDATE ============
  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const entity = await this.usersRepository.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('User not found');

    if (dto.email) {
      const newEmail = this.normalizeEmail(dto.email);
      if (newEmail !== entity.email) {
        const dup = await this.usersRepository
          .createQueryBuilder('x')
          .where('LOWER(x.email) = :email', { email: newEmail })
          .andWhere('x.id != :id', { id })
          .getOne();
        if (dup) throw new ConflictException('Email already exists');
        entity.email = newEmail;
      }
    }

    if (dto.password) {
      entity.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (typeof dto.firstName === 'string') {
      entity.firstName = dto.firstName || null;
    }
    if (typeof dto.lastName === 'string') {
      entity.lastName = dto.lastName || null;
    }

    if (typeof dto.recSts === 'number') {
      entity.recSts = dto.recSts;
    }

    const saved = await this.usersRepository.save(entity);
    return this.mapEntityToUser(saved);
  }

  // ============ SOFT DELETE ============
  async remove(id: number): Promise<{ success: boolean; recSts: number }> {
    const entity = await this.usersRepository.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('User not found');

    entity.recSts = 0;
    await this.usersRepository.save(entity);

    return { success: true, recSts: entity.recSts };
  }

  // ============ Helpers ============
  async findByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = this.normalizeEmail(email);
    const entity = await this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', { email: normalizedEmail })
      .getOne();
    return entity ? this.mapEntityToUser(entity) : undefined;
  }

  async validatePassword(user: User, plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, user.passwordHash);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private mapEntityToUser(entity: UserEntity): User {
    return {
      id: entity.id,
      email: entity.email,
      passwordHash: entity.passwordHash,
      recSts: entity.recSts ?? 1,
      firstName: entity.firstName ?? undefined,
      lastName: entity.lastName ?? undefined,
      passwordCode: entity.passwordCode ?? undefined,
      passwordCodeDate: entity.passwordCodeDate ?? undefined,
    };
  }

  private normalizeSort(sort?: string): { column: string; direction: 'ASC' | 'DESC' } {
    const allowed: Record<string, string> = {
      id: 'u.id',
      email: 'u.email',
      firstName: 'u.firstName',
      lastName: 'u.lastName',
      recSts: 'u.recSts',
    };
    if (!sort || typeof sort !== 'string') {
      return { column: 'u.id', direction: 'DESC' };
    }
    const [rawCol, rawDir] = sort.split(':').map((s) => s.trim());
    const col = allowed[rawCol] ?? 'u.id';
    const dir = (rawDir || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    return { column: col, direction: dir };
  }

  // ============ NEW: Assign Team friendly list ============
  /**
   * قائمة خفيفة لاختيار أعضاء الفريق في الويزارد.
   * Params: search, onlyActive (true), limit (20), offset (0)
   * Return: { items: [{id,email,firstName,lastName,initials}], total }
   */
  async listForAssign(paramsIn?: {
    search?: string;
    onlyActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ items: Array<User & { initials: string }>; total: number }> {
    const search = paramsIn?.search?.trim() ?? '';
    const onlyActive = paramsIn?.onlyActive !== false; // default true
    const limit = Math.min(100, Math.max(1, Number(paramsIn?.limit ?? 20)));
    const offset = Math.max(0, Number(paramsIn?.offset ?? 0));

    const qb = this.usersRepository.createQueryBuilder('u')
      .select(['u.id', 'u.email', 'u.firstName', 'u.lastName', 'u.passwordHash', 'u.recSts']);

    if (onlyActive) {
      qb.andWhere('u.recSts = :recSts', { recSts: 1 });
    }

    if (search) {
      const s = `%${search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(u.email) LIKE :s OR LOWER(u.firstName) LIKE :s OR LOWER(u.lastName) LIKE :s)',
        { s },
      );
    }

    qb.orderBy('u.id', 'DESC').skip(offset).take(limit);

    const [rows, total] = await qb.getManyAndCount();

    const items = rows.map((e) => {
      const u = this.mapEntityToUser(e);
      return { ...u, initials: this.getInitials(u.firstName, u.lastName) };
    });

    return { items, total };
  }

  // helper لعمل الـ initials (AJ, MG, ...)
  private getInitials(first?: string, last?: string): string {
    const a = (first || '').trim();
    const b = (last || '').trim();
    return `${a.slice(0, 1)}${b.slice(0, 1)}`.toUpperCase();
  }
}
