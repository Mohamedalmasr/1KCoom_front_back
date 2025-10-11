import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const u = await this.usersService.create(dto);
    return {
      id: u.id,
      email: u.email,
      recSts: u.recSts,
      firstName: u.firstName,
      lastName: u.lastName,
      passwordCode: u.passwordCode,
      passwordCodeDate: u.passwordCodeDate?.toISOString(),
    };
  }

  @Get()
  async findAll(@Query() q: ListUsersDto) {
    const limit = q.limit ?? 20;

    // NEW: ندعم offset أو skip؛ وإلا نحسبه من page
    const offset =
      typeof q.offset === 'number' ? q.offset :
      typeof q.skip === 'number'   ? q.skip   :
      Math.max(0, ((q.page ?? 1) - 1) * limit);

    const { items, total } = await this.usersService.findAll({
      page: q.page,
      limit,
      offset,
      includeInactive: q.includeInactive === true,
      search: q.search ?? q.q,
      sort: q.sort,
    });

    return {
      limit,
      offset,
      total,
      items: items.map((u) => ({
        id: u.id,
        email: u.email,
        recSts: u.recSts,
        firstName: u.firstName,
        lastName: u.lastName,
        passwordCodeDate: u.passwordCodeDate?.toISOString(),
      })),
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const u = await this.usersService.findOneById(id);
    return {
      id: u.id,
      email: u.email,
      recSts: u.recSts,
      firstName: u.firstName,
      lastName: u.lastName,
      passwordCodeDate: u.passwordCodeDate?.toISOString(),
    };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    const u = await this.usersService.update(id, dto);
    return {
      id: u.id,
      email: u.email,
      recSts: u.recSts,
      firstName: u.firstName,
      lastName: u.lastName,
      passwordCodeDate: u.passwordCodeDate?.toISOString(),
    };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Get('assign')
  async listForAssign(
    @Query('search') search?: string,
    @Query('q') qAlt?: string,
    @Query('onlyActive') onlyActive: string | number | boolean = '1',
    @Query('limit') limit: string | number = '20',
    @Query('offset') offset: string | number = '0',
  ) {
    const { items, total } = await this.usersService.listForAssign({
      search: (search ?? qAlt ?? '').toString(),
      onlyActive: !(
        onlyActive === '0' ||
        onlyActive === 0 ||
        onlyActive === 'false' ||
        onlyActive === false
      ),
      limit: Number(limit),
      offset: Number(offset),
    });

    return {
      total,
      limit: Number(limit),
      offset: Number(offset),
      items: items.map((u: any) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        recSts: u.recSts,
        initials: u.initials,
      })),
    };
  }
}
