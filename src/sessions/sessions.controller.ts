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
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  create(@Body() dto: CreateSessionDto) {
    return this.sessionsService.create(dto);
  }

  @Get()
  findAll() {
    return this.sessionsService.findAll();
  }

  @Get('task/:taskId')
  findForTask(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Query('usersAID') usersAID?: string,
  ) {
    const userFilter =
      usersAID !== undefined && usersAID !== null ? Number(usersAID) : undefined;
    if (userFilter !== undefined && !Number.isNaN(userFilter)) {
      return this.sessionsService.findForTask(taskId, userFilter);
    }
    return this.sessionsService.findByTask(taskId);
  }

  @Get('task/:taskId/summary')
  summaryForTask(@Param('taskId', ParseIntPipe) taskId: number) {
    return this.sessionsService.summaryForTask(taskId);
  }

  @Get('user/:userId')
  findForUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.sessionsService.findByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sessionsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.sessionsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.sessionsService.remove(id);
    return { success: true };
  }
}
