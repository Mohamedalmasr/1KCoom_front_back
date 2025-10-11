import { IsOptional, IsInt, Min, IsString, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

// يحوّل 0/1/true/false إلى boolean
const toBool = (v: any) => {
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true';
};

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

  // NEW: بعض الواجهات بتبعتها
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  // NEW: دعم offset أيضًا
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  // بدل IsBooleanString عشان نقبل 0/1/true/false
  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  includeInactive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  // alias للبحث
  @IsOptional()
  @IsString()
  q?: string;

  // مثال: "id:asc" أو "email:desc"
  @IsOptional()
  @IsString()
  sort?: string;
}
