import { IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';

export class CreateSessionDto {
  @IsInt()
  taskId!: number;

  @IsInt()
  userId!: number;

  @IsISO8601()
  startTime!: string;

  @IsISO8601()
  endTime!: string;

  @IsInt()
  @Min(0)
  durationMs!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
