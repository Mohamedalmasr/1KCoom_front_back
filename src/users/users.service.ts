import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { ILike, Repository } from 'typeorm';
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
  role: string;
}

type FindAllOpts = {
  page?: number;
  limit?: number;
  offset?: number;          // NEW
  includeInactive?: boolean;
  search?: string;
  sort?: string;            // e.g. "id:asc"
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
    const exists = await this.usersRepository.findOne({ where: { email } });
    if (exists) throw new ConflictException('Email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const entity = this.usersRepository.create({
      email,
      passwordHash,
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      role: dto.role ?? 'member',
      // recSts = 1 by default
    });

    const saved = await this.usersRepository.save(entity);
    return this.mapEntityToUser(saved);
  }

  // ============ LIST ============
  async findAll(opts: FindAllOpts = {}) {
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const hasOffset = typeof opts.offset === 'number' && opts.offset >= 0;
    const offset = hasOffset
      ? (opts.offset as number)
      : Math.max(0, ((opts.page ?? 1) - 1) * limit);

    const includeInactive = !!opts.includeInactive;
    const q = opts.search?.trim();

    // فلتر RecSts
    const base = includeInactive ? {} : { recSts: 1 as any };

    // where باستخدام ILike مع Repository (OR conditions)
    const where = q
      ? [
          { ...base, email: ILike(`%${q}%`) },
          { ...base, firstName: ILike(`%${q}%`) },
          { ...base, lastName: ILike(`%${q}%`) },
        ]
      : base;

    // sort
    const order = this.buildOrder(opts.sort);

    const [rows, total] = await this.usersRepository.findAndCount({
      where,
      order,
      skip: offset,
      take: limit,
    });

    return {
      items: rows.map((e) => this.mapEntityToUser(e)),
      page: Math.floor(offset / limit) + 1,
      limit,
      total,
      offset,
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
        const dup = await this.usersRepository.findOne({ where: { email: newEmail } });
        if (dup && dup.id !== id) throw new ConflictException('Email already exists');
        entity.email = newEmail;
      }
    }

    if (dto.password) {
      entity.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    if (typeof dto.firstName === 'string') entity.firstName = dto.firstName || null;
    if (typeof dto.lastName === 'string') entity.lastName = dto.lastName || null;
    if (typeof dto.recSts === 'number') entity.recSts = dto.recSts;
    if (dto.role) entity.role = dto.role;

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
    const entity = await this.usersRepository.findOne({ where: { email: normalizedEmail } });
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
      role: entity.role ?? 'member',
    };
  }

  private buildOrder(sort?: string): Record<string, 'ASC' | 'DESC'> {
    const allowed: Record<string, keyof UserEntity> = {
      id: 'id',
      email: 'email',
      firstName: 'firstName',
      lastName: 'lastName',
      recSts: 'recSts',
    };
    if (!sort) return { id: 'DESC' };
    const [rawCol, rawDir] = sort.split(':').map((s) => s.trim());
    const key = allowed[rawCol] ?? 'id';
    const dir = (rawDir || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    return { [key]: dir };
  }

  // ============ Assign list (Repository + ILike) ============
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

    const base = onlyActive ? { recSts: 1 as any } : {};
    const where = search
      ? [
          { ...base, email: ILike(`%${search}%`) },
          { ...base, firstName: ILike(`%${search}%`) },
          { ...base, lastName: ILike(`%${search}%`) },
        ]
      : base;

    const [rows, total] = await this.usersRepository.findAndCount({
      where,
      order: { id: 'DESC' },
      skip: offset,
      take: limit,
    });

    const items = rows.map((e) => {
      const u = this.mapEntityToUser(e);
      return { ...u, initials: this.getInitials(u.firstName, u.lastName) };
    });

    return { items, total };
  }

  private getInitials(first?: string, last?: string): string {
    const a = (first || '').trim();
    const b = (last || '').trim();
    return `${a.slice(0, 1)}${b.slice(0, 1)}`.toUpperCase();
  }
}
