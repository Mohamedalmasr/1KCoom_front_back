import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { TASK_STATUS_VALUES } from './update-task-status.dto';
import type { TaskStatusValue } from './update-task-status.dto';

export const TASK_PRIORITY_VALUES = ['high', 'medium', 'low'] as const;
export type TaskPriorityValue = (typeof TASK_PRIORITY_VALUES)[number];

export class ListProjectTasksDto {
  @IsOptional()
  @IsIn(TASK_STATUS_VALUES)
  status?: TaskStatusValue;

  @IsOptional()
  @IsIn(TASK_PRIORITY_VALUES)
  priority?: TaskPriorityValue;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
