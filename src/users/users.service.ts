import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../mail/mail.service';
import { CreateUserDto } from './dto/create-user.dto';

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

const USERS_TABLE = 'tc_users';

@Injectable()
export class UsersService {
  constructor(
    private readonly database: DatabaseService,
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

    const query = `
      INSERT INTO ${USERS_TABLE} (
        "Email",
        "Password",
        "RecSts",
        "FrstNme",
        "LastNme",
        "PasswordCode",
        "PasswordCodeDate"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        "UsersAID" AS "id",
        "Email" AS "email",
        "Password" AS "passwordHash",
        "RecSts" AS "recSts",
        "FrstNme" AS "firstName",
        "LastNme" AS "lastName",
        "PasswordCode" AS "passwordCode",
        "PasswordCodeDate" AS "passwordCodeDate";
    `;

    const result = await this.database.query<UserRecord>(query, [
      email,
      passwordHash,
      recSts,
      createUserDto.firstName ?? null,
      createUserDto.lastName ?? null,
      verificationCode,
      codeTimestamp,
    ]);

    const row = result.rows[0];
    const user = this.mapRecordToUser(row);

    await this.mailService.sendVerificationEmail(user.email, verificationCode);

    return user;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = this.normalizeEmail(email);

    const query = `
      SELECT
        "UsersAID" AS "id",
        "Email" AS "email",
        "Password" AS "passwordHash",
        "RecSts" AS "recSts",
        "FrstNme" AS "firstName",
        "LastNme" AS "lastName",
        "PasswordCode" AS "passwordCode",
        "PasswordCodeDate" AS "passwordCodeDate"
      FROM ${USERS_TABLE}
      WHERE LOWER("Email") = $1
      LIMIT 1;
    `;

    const result = await this.database.query<UserRecord>(query, [normalizedEmail]);
    const row = result.rows[0];
    return row ? this.mapRecordToUser(row) : undefined;
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

  private mapRecordToUser(record: UserRecord): User {
    return {
      id: record.id,
      email: record.email,
      passwordHash: record.passwordHash,
      recSts: record.recSts ?? 1,
      firstName: record.firstName ?? undefined,
      lastName: record.lastName ?? undefined,
      passwordCode: record.passwordCode ?? undefined,
      passwordCodeDate: record.passwordCodeDate
        ? new Date(record.passwordCodeDate)
        : undefined,
    };
  }
}

type UserRecord = {
  id: number;
  email: string;
  passwordHash: string;
  recSts: number | null;
  firstName: string | null;
  lastName: string | null;
  passwordCode: string | null;
  passwordCodeDate: string | Date | null;
};
