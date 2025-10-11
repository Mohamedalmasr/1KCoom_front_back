import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateTaskDto {
  @IsOptional() @IsString() @MaxLength(255)
  title?: string;

  @IsOptional() @IsString() @MaxLength(500)
  subject?: string;

  @IsOptional() @IsNumber() @Min(0)
  estimatedHours?: number;

  @IsOptional() @IsEnum({ High: 'High', Medium: 'Medium', Low: 'Low' } as const)
  priority?: 'High' | 'Medium' | 'Low';

  @IsOptional() @IsDateString()
  dateStrt?: string;

  @IsOptional() @IsDateString()
  dateDue?: string;

  @IsOptional() @IsDateString()
  dateEnd?: string;

  @IsOptional() @IsInt()
  taskSts?: number;
}
