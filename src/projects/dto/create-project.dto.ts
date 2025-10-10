import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTaskDto {
  @IsString() @MinLength(1) @MaxLength(255) title!: string;
  @IsOptional() @IsString() @MaxLength(500) subject?: string;
  @IsOptional() @IsNumber() estimatedHours?: number;
  @IsOptional() @IsEnum(['Low','Medium','High'] as any) priority?: 'Low'|'Medium'|'High';
}

export class CreateProjectDto {
  @IsNotEmpty()
  name: string;

  @IsOptional() @IsString() @MaxLength(16)  projectCode?: string;
  @IsOptional() @IsString() @MaxLength(5000) projectDesc?: string;

  @IsOptional() @IsInt()    leaderAID?: number;
  @IsOptional() @IsString() @MaxLength(100) type?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsNumber() budget?: number;
  @IsOptional() @IsEnum(['On Track','Offtrack','Completed'] as any)
  status?: 'On Track'|'Offtrack'|'Completed';

  @IsArray() @ArrayNotEmpty() @IsInt({ each: true }) members!: number[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateTaskDto) tasks!: CreateTaskDto[];
  @IsOptional() @IsString() @MaxLength(255) projectName?: string;
}
