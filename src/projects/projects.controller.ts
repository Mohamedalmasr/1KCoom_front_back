import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AddAssigneesDto } from './dto/add-assignees.dto';
import { ClaimTaskDto } from './dto/claim-task.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  // ===== Projects =====
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateProjectDto) {
    return this.svc.createProject(dto);
  }

  // يدعم limit/offset وكذلك skip/take للتوافق
  @Get()
  list(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.svc.listProjects({
      q,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getProjectDetail(id);
  }

  @Patch(':id')
  updateProject(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProjectDto) {
    return this.svc.updateProject(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProject(@Param('id', ParseIntPipe) id: number) {
    return this.svc.deleteProject(id);
  }

  // ===== Tasks =====
  @Post(':id/tasks')
  @HttpCode(HttpStatus.CREATED)
  createTask(@Param('id', ParseIntPipe) projectId: number, @Body() dto: UpdateTaskDto) {
    return this.svc.createTask(projectId, dto);
  }

  @Post('code/:code/tasks')
  @HttpCode(HttpStatus.CREATED)
  createTaskByCode(@Param('code') code: string, @Body() dto: UpdateTaskDto) {
    return this.svc.createTaskByCode(code, dto);
  }

  @Patch(':id/tasks/:taskId')
  updateTask(
    @Param('id', ParseIntPipe) projectId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.svc.updateTask(projectId, taskId, dto);
  }

  @Delete(':id/tasks/:taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTask(@Param('id', ParseIntPipe) projectId: number, @Param('taskId', ParseIntPipe) taskId: number) {
    return this.svc.deleteTask(projectId, taskId);
  }

  // ===== Assignees =====
  @Post(':id/tasks/:taskId/assignees')
  addAssignees(
    @Param('id', ParseIntPipe) projectId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: AddAssigneesDto,
  ) {
    return this.svc.addTaskAssignees(projectId, taskId, dto);
  }

  @Delete(':id/tasks/:taskId/assignees/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAssignee(
    @Param('id', ParseIntPipe) projectId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.svc.removeTaskAssignee(projectId, taskId, userId);
  }

  @Post(':id/tasks/:taskId/claim')
  claimTask(
    @Param('id', ParseIntPipe) projectId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: ClaimTaskDto,
  ) {
    return this.svc.claimTask(projectId, taskId, dto);
  }
}
