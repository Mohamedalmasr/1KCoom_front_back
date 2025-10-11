import { IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional() @IsString() @Length(1, 16)
  projectCode?: string;

  @IsOptional() @IsString() @MaxLength(255)
  name?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  projectDesc?: string;

  @IsOptional() @IsInt()
  leaderAID?: number;

  @IsOptional() @IsString() @MaxLength(50)
  type?: string;

  @IsOptional() @IsDateString()
  startDate?: string;

  @IsOptional() @IsDateString()
  dueDate?: string;

  @IsOptional() @IsNumber()
  budget?: number;

  @IsOptional() @IsString() @MaxLength(20)
  status?: string;

  // لو مش عايز تعدّل الأعضاء سيبها undefined
  @IsOptional() @IsArray() @IsInt({ each: true })
  members?: number[];
}
