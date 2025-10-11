import { Type } from 'class-transformer';
import {
  ArrayNotEmpty, IsArray, IsDateString, IsEnum, IsInt, IsNumber,
  IsOptional, IsString, Length, MaxLength, Min, ValidateNested
} from 'class-validator';

export class CreateTaskInputDto {
  @IsString() @MaxLength(255)
  title!: string;

  @IsString() @MaxLength(500)
  subject!: string;

  @IsNumber() @Min(0)
  estimatedHours!: number;

  @IsEnum({ High: 'High', Medium: 'Medium', Low: 'Low' } as const)
  priority!: 'High' | 'Medium' | 'Low';
}

export class CreateProjectDto {
  @IsString() @Length(1, 16)
  projectCode!: string;

  @IsString() @MaxLength(255)
  name!: string;

  @IsOptional() @IsString() @MaxLength(5000)
  projectDesc?: string;

  @IsOptional() @IsInt()
  leaderAID?: number;

  @IsString() @MaxLength(50)
  type!: string;

  @IsOptional() @IsDateString()
  startDate?: string;

  @IsOptional() @IsDateString()
  dueDate?: string;

  @IsNumber()
  budget!: number;

  @IsString() @MaxLength(20)
  status!: string;

  @IsArray() @ArrayNotEmpty() @IsInt({ each: true })
  members!: number[];

  @IsArray() @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskInputDto)
  tasks!: CreateTaskInputDto[];
}
