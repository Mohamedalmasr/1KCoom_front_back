import { PartialType } from '@nestjs/mapped-types';
import { CreateBlogDto } from './create-blog.dto';
import { IsOptional, IsString, Length, IsDateString } from 'class-validator';

export class UpdateBlogDto extends PartialType(CreateBlogDto) {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  blogSubj?: string;

  @IsOptional()
  @IsString()
  blogBody?: string;

  @IsOptional()
  @IsDateString()
  creaDt?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  creaBy?: string;

  @IsOptional()
  @IsString()
  @Length(1, 1)
  recSts?: string;
}
