import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListProjectsDto {
  // ندعم limit/offset (وأيضًا take/skip لو جاية من عميل قديم)
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  offset?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  skip?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  take?: number;

  @IsOptional() @IsString()
  status?: string;   // "On Track" | "Offtrack" | "Completed" (case-insensitive)

  @IsOptional() @IsString()
  q?: string;        // بحث بالاسم/الوصف/الكود
}
