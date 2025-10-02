import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsIn,
  Length,
} from 'class-validator';

export class CreateContactDto {
  @IsString()
  @Length(1, 50)
  fstname: string;

  @IsString()
  @Length(1, 50)
  lstname: string;

  @IsString()
  @Length(1, 16)
  phone: string;

  @IsOptional()
  @IsIn(['U2K', '2-5K', '5-10', '10+']) // أكواد مختصرة تناسب طول 5
  budget?: 'U2K' | '2-5K' | '5-10' | '10+';

  @IsOptional()
  @IsBoolean()
  webdesign?: boolean;

  @IsOptional()
  @IsBoolean()
  wordpress?: boolean;

  @IsOptional()
  @IsBoolean()
  seo?: boolean;

  @IsOptional()
  @IsBoolean()
  marketing?: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 3000)
  msg?: string;

  @IsOptional()
  @IsEmail()
  @Length(1, 254)
  email?: string;
}
