import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'tC_Blog' })
export class Blog {
  @PrimaryGeneratedColumn({ name: 'BlogAID', type: 'int4' })
  blogAID: number;

  @Column({ name: 'BlogSubj', type: 'varchar', length: 255 })
  blogSubj: string;

  @Column({ name: 'BlogBody', type: 'text' })
  blogBody: string;

  @Column({ name: 'CreaDt', type: 'date', nullable: true })
  creaDt: string | null; // ISO date string: 'YYYY-MM-DD'

  @Column({ name: 'CreaBy', type: 'varchar', length: 255, nullable: true })
  creaBy: string | null;

  @Column({ name: 'RecSts', type: 'char', length: 1, default: () => `'V'` })
  recSts: string; // 'V' valid, 'D' deleted (لو عايز حذف منطقي)
}
