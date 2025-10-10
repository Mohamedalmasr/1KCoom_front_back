import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.svc.create(dto);
  }

  @Get()
  list(
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('limit') limit = '20',
    @Query('offset') offset = '0',
  ) {
    return this.svc.list({
      status,
      q,
      limit: Number(limit),
      offset: Number(offset),
    });
  }
}
