import { ArrayNotEmpty, IsArray, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddAssigneesDto {
  @IsArray() @ArrayNotEmpty() @IsInt({ each: true })
  users!: number[];

  // اختيارية – نفس الدور لكل المضافين
  @IsOptional() @IsString() @MaxLength(50)
  role?: string;
}
