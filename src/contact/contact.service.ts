import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private readonly repo: Repository<Contact>,
  ) {}

  private yn(b?: boolean): 'Y' | 'N' | null {
    if (typeof b === 'undefined') return null;
    return b ? 'Y' : 'N';
  }

  private today(): string {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  async create(dto: CreateContactDto, clientip?: string) {
    const entity = this.repo.create({
      fstname: dto.fstname,
      lstname: dto.lstname,
      phone: dto.phone,
      budget: dto.budget ?? null,
      webdesign: this.yn(dto.webdesign),
      wordpress: this.yn(dto.wordpress),
      seo: this.yn(dto.seo),
      marketing: this.yn(dto.marketing),
      msg: dto.msg ?? null,
      creadt: this.today(),
      clientip: clientip ?? null,
      recstsd: 'A',
      email: dto.email ?? null,
    });

    return this.repo.save(entity);
  }
}
