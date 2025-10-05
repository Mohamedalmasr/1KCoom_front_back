import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from  '../common/guards/jwt-auth.guard';
import { ChangeMyPasswordDto } from './dto/change-my-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return this.authService.me(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@Req() req: any, @Body() dto: UpdateMeDto) {
    return this.authService.updateMe(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  changeMyPassword(@Req() req: any, @Body() dto: ChangeMyPasswordDto) {
    return this.authService.changeMyPassword(req.user.sub, dto.currentPassword, dto.newPassword);
  }
}
