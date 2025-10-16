import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

/* ========= Public endpoint (website form) ========= */
@Controller('contact')
export class ContactController {
  constructor(private readonly service: ContactService) {}

  @Post()
  async create(@Body() dto: CreateContactDto, @Ip() ip: string) {
    const created = await this.service.create(dto, ip);
    return { ok: true, data: created };
  }
}

/* ========= Admin endpoints ========= */
/** مخصّص للوحة التحكم: لستة/تفاصيل/حذف */
@Controller('admin/contacts')
export class AdminContactsController {
  constructor(private readonly service: ContactService) {}

  /** GET /admin/contacts?q=&budget=&limit=&offset= */
  @Get()
  async list(
    @Query('q') q?: string,
    @Query('budget') budget?: 'U2K' | '2-5K' | '5-10' | '10+',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.listAdmin({
      q,
      budget,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  /** GET /admin/contacts/:id */
  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.getOneAdmin(id);
  }

  /** DELETE /admin/contacts/:id */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.deleteAdmin(id);
    // 204 No Content
  }
}
