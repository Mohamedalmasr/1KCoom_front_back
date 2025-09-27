import { Body, Controller, Post } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);

    return {
      id: user.id,
      email: user.email,
      recSts: user.recSts,
      firstName: user.firstName,
      lastName: user.lastName,
      passwordCode: user.passwordCode,
      passwordCodeDate: user.passwordCodeDate?.toISOString(),
    };
  }
}
