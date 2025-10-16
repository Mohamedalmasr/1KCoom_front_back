// src/contact/contact.service.ts
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';

/** نفس الأكواد المستخدمة في الفرونت */
export type BudgetCode = 'U2K' | '2-5K' | '5-10' | '10+';

export type AdminContactRow = {
  id: number;
  fstname: string;
  lstname: string;
  email: string | null;
  phone: string;
  budget: BudgetCode | null;
  webdesign: boolean;
  wordpress: boolean;
  seo: boolean;
  marketing: boolean;
  msg: string | null;
  /** ISO أو YYYY-MM-DD من العمود creatd */
  creaDt: string | null;
};

export type ListContactsParams = {
  q?: string;
  budget?: BudgetCode;
  limit?: number;   // default 12
  offset?: number;  // default 0
};

export type ListContactsResponse = {
  items: AdminContactRow[];
  total: number;
  limit: number;
  offset: number;
};

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private readonly repo: Repository<Contact>,
  ) {}

  /* ========================= helpers ========================= */

  private yn(b?: boolean): 'Y' | 'N' | null {
    if (typeof b === 'undefined') return null;
    return b ? 'Y' : 'N';
  }

  private yToBool(y?: string | null): boolean {
    return (y ?? '').toUpperCase() === 'Y';
  }

  private today(): string {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  private mapRow(r: Contact): AdminContactRow {
    return {
      id: r.clientaid,
      fstname: r.fstname,
      lstname: r.lstname,
      email: r.email ?? null,
      phone: r.phone,
      budget: (r.budget as BudgetCode | null) ?? null,
      webdesign: this.yToBool(r.webdesign),
      wordpress: this.yToBool(r.wordpress),
      seo: this.yToBool(r.seo),
      marketing: this.yToBool(r.marketing),
      msg: r.msg ?? null,
      creaDt: r.creadt, // هنرجّعها زي ما هي (الفرونت بيعمل toLocale)
    };
  }

  /* ====================== public (website) ===================== */

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

  /* ======================== admin APIs ======================== */

  /** GET /admin/contacts  (q, budget, limit, offset) */
  async listAdmin(params: ListContactsParams): Promise<ListContactsResponse> {
    const limit = Math.max(1, Math.min(200, params.limit ?? 12));
    const offset = Math.max(0, params.offset ?? 0);
    const q = (params.q ?? '').trim();

    const qb = this.repo.createQueryBuilder('c').where('1=1');

    if (q) {
      qb.andWhere(
        `(c.fstname ILIKE :q OR c.lstname ILIKE :q OR c.email ILIKE :q OR c.phone ILIKE :q OR c.msg ILIKE :q)`,
        { q: `%${q}%` },
      );
    }

    if (params.budget) {
      qb.andWhere('c.budget = :b', { b: params.budget });
    }

    qb.orderBy('c.clientaid', 'DESC').skip(offset).take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map((r) => this.mapRow(r)),
      total,
      limit,
      offset,
    };
  }

  /** GET /admin/contacts/:id */
  async getOneAdmin(id: number): Promise<AdminContactRow> {
    const row = await this.repo.findOne({
      where: { clientaid: id },
    });
    if (!row) throw new NotFoundException('Contact not found');
    return this.mapRow(row);
  }

  /** DELETE /admin/contacts/:id */
  async deleteAdmin(id: number): Promise<{ success: boolean }> {
    const res = await this.repo.delete({ clientaid: id });
    if (!res.affected) throw new NotFoundException('Contact not found');
    return { success: true };
  }
}
