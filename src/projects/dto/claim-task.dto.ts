import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class ClaimTaskDto {
  // لو ماعندكش Auth، ابعت الـ userAID هنا
  @IsOptional() @IsInt()
  userAID?: number;

  @IsOptional() @IsString() @MaxLength(50)
  role?: string;

  // لو true هيتم إزالة أي مكلّفين آخرين (افتراضي true)
  @IsOptional() @IsBoolean()
  exclusive?: boolean;
}
