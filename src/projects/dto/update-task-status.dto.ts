import { IsIn } from 'class-validator';

export const TASK_STATUS_VALUES = ['todo', 'in_progress', 'done'] as const;
export type TaskStatusValue = (typeof TASK_STATUS_VALUES)[number];

export class UpdateTaskStatusDto {
  @IsIn(TASK_STATUS_VALUES)
  status!: TaskStatusValue;
}
