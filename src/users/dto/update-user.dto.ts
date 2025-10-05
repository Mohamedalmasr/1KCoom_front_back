import { IsEmail, IsIn, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  // Soft state control (1 = active, 0 = deleted)
  @IsOptional()
  @IsInt()
  @IsIn([0, 1] as const)
  recSts?: number;
}
