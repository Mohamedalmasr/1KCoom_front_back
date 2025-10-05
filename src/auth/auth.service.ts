import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(credentials: LoginDto) {
    const user = await this.usersService.findByEmail(credentials.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const isValidPassword = await this.usersService.validatePassword(user, credentials.password);
    if (!isValidPassword) throw new UnauthorizedException('Invalid email or password');

    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        recSts: user.recSts,
        firstName: user.firstName,
        lastName: user.lastName,
        passwordCode: user.passwordCode,
        passwordCodeDate: user.passwordCodeDate?.toISOString(),
      },
    };
  }

  async me(userId: number) {
    const me = await this.usersService.findOneById(userId, true);
    return {
      id: me.id,
      email: me.email,
      recSts: me.recSts,
      firstName: me.firstName,
      lastName: me.lastName,
      passwordCode: me.passwordCode,
      passwordCodeDate: me.passwordCodeDate?.toISOString(),
    };
  }

  async updateMe(userId: number, dto: UpdateMeDto) {
    // منع تكرار الإيميل
    if (dto.email) {
      const existing = await this.usersService.findByEmail(dto.email);
      if (existing && existing.id !== userId) {
        throw new ConflictException('Email already exists');
      }
    }
    const updated = await this.usersService.update(userId, dto as any);
    return {
      id: updated.id,
      email: updated.email,
      recSts: updated.recSts,
      firstName: updated.firstName,
      lastName: updated.lastName,
    };
  }

  async changeMyPassword(userId: number, current: string, next: string) {
    const user = await this.usersService.findOneById(userId, true);
    const ok = await this.usersService.validatePassword(user, current);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');

    await this.usersService.update(userId, { password: next } as any);
    return { success: true };
  }
}
