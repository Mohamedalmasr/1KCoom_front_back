import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Blog } from './entities/blog.entity';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(Blog)
    private readonly blogRepo: Repository<Blog>,
  ) {}

  async create(dto: CreateBlogDto): Promise<Blog> {
    const entity = this.blogRepo.create({
      blogSubj: dto.blogSubj,
      blogBody: dto.blogBody,
      creaBy: dto.creaBy ?? null,
      creaDt: dto.creaDt ?? new Date().toISOString().slice(0, 10), // YYYY-MM-DD
      recSts: dto.recSts ?? 'V',
    });
    return this.blogRepo.save(entity);
  }

  async findAll(): Promise<Blog[]> {
    // لو عايز ترجع بس السجلات الفعّالة: where: { recSts: 'V' }
    return this.blogRepo.find({ order: { blogAID: 'DESC' } });
  }

  async findOne(id: number): Promise<Blog> {
    const row = await this.blogRepo.findOne({ where: { blogAID: id } });
    if (!row) throw new NotFoundException('Blog not found');
    return row;
  }

  async update(id: number, dto: UpdateBlogDto): Promise<Blog> {
    const row = await this.findOne(id);
    Object.assign(row, dto);
    return this.blogRepo.save(row);
  }

  async remove(id: number): Promise<{ success: true }> {
    const row = await this.findOne(id);
    await this.blogRepo.remove(row); // حذف فعلي
    // للحذف المنطقي: row.recSts = 'D'; await this.blogRepo.save(row);
    return { success: true };
  }
}
