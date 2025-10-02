import { Body, Controller, Ip, Post } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly service: ContactService) {}

  @Post()
  async create(@Body() dto: CreateContactDto, @Ip() ip: string) {
    const created = await this.service.create(dto, ip);
    return {
      ok: true,
      data: created,
    };
  }
}
