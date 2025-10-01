import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { CreateUserDto } from './dto/create-user.dto';
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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly mailService: MailService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const email = this.normalizeEmail(createUserDto.email);
    const existingUser = await this.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);
    const recSts = 1;
    const verificationCode = this.generateVerificationCode();
    const codeTimestamp = new Date();

    const userEntity = this.usersRepository.create({
      email,
      passwordHash,
      recSts,
      firstName: createUserDto.firstName ?? null,
      lastName: createUserDto.lastName ?? null,
      passwordCode: verificationCode,
      passwordCodeDate: codeTimestamp,
    });

    const savedUser = await this.usersRepository.save(userEntity);
    const user = this.mapEntityToUser(savedUser);

    await this.mailService.sendVerificationEmail(user.email, verificationCode);

    return user;
  }

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

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
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
}
