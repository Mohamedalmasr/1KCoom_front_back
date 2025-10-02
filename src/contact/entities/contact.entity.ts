import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tc_ipind' }) 
export class Contact {
  @PrimaryGeneratedColumn({ name: 'clientaid', type: 'int4' })
  clientaid: number;

  @Column({ name: 'fstname', type: 'varchar', length: 50, nullable: false })
  fstname: string;

  @Column({ name: 'lstname', type: 'varchar', length: 50, nullable: false })
  lstname: string;

  @Column({ name: 'phone', type: 'varchar', length: 16, nullable: false })
  phone: string;

  @Column({ name: 'budget', type: 'varchar', length: 5, nullable: true })
  budget: string | null;

  @Column({ name: 'webdesign', type: 'char', length: 1, nullable: true })
  webdesign: string | null; // Y / N

  @Column({ name: 'wordpress', type: 'char', length: 1, nullable: true })
  wordpress: string | null; // Y / N

  @Column({ name: 'seo', type: 'char', length: 1, nullable: true })
  seo: string | null; // Y / N

  @Column({ name: 'marketing', type: 'char', length: 1, nullable: true })
  marketing: string | null; // Y / N

  @Column({ name: 'msg', type: 'varchar', length: 3000, nullable: true })
  msg: string | null;

  @Column({ name: 'creadt', type: 'date', nullable: true })
  creadt: string | null; // نحطها YYYY-MM-DD

  @Column({ name: 'clientip', type: 'varchar', length: 50, nullable: true })
  clientip: string | null;

  @Column({ name: 'recstsd', type: 'char', length: 1, default: () => `'A'` })
  recstsd: string; // A = Active (مثال)

  @Column({ name: 'email', type: 'varchar', length: 254, nullable: true })
  email: string | null;
}
