import { IsOptional, IsInt, Min, IsString, IsBooleanString } from 'class-validator';
import { Type } from 'class-transformer';

export class ListUsersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  // تقبل "true"/"false" كسلسلة عشان تتماشى مع الكلاينت
  @IsOptional()
  @IsBooleanString()
  includeInactive?: boolean | string;

  @IsOptional()
  @IsString()
  search?: string;

  // alias اختياري لو بتبعت q بدل search
  @IsOptional()
  @IsString()
  q?: string;

  // مثال: "id:asc" أو "email:desc"
  @IsOptional()
  @IsString()
  sort?: string;
}
