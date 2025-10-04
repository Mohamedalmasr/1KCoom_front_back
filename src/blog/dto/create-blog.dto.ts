import { IsNotEmpty, IsOptional, IsString, Length, IsDateString } from 'class-validator';

export class CreateBlogDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  blogSubj: string;

  @IsString()
  @IsNotEmpty()
  blogBody: string;

  @IsOptional()
  @IsDateString() // 'YYYY-MM-DD'
  creaDt?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  creaBy?: string;

  @IsOptional()
  @IsString()
  @Length(1, 1)
  recSts?: string; // افتراضي 'V'
}
