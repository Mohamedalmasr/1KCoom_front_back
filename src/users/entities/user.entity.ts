import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tc_users' })
export class UserEntity {
  @PrimaryGeneratedColumn({ name: 'UsersAID' })
  id!: number;

  @Column({ name: 'Email', type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'Password', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ name: 'RecSts', type: 'int', default: 1 })
  recSts!: number;

  @Column({ name: 'FrstNme', type: 'varchar', length: 255, nullable: true })
  firstName?: string | null;

  @Column({ name: 'LastNme', type: 'varchar', length: 255, nullable: true })
  lastName?: string | null;

  @Column({ name: 'PasswordCode', type: 'varchar', length: 255, nullable: true })
  passwordCode?: string | null;

  @Column({ name: 'PasswordCodeDate', type: 'timestamp', nullable: true })
  passwordCodeDate?: Date | null;

  // 👇 لاحظ الاسم الصغير هنا لو جدولك فعلاً فيه role small-caseش
  @Column({ name: 'role', type: 'varchar', length: 20, default: 'member' })
  role!: string;
}
