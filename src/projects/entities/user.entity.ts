import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ name: 'tc_users' })
export class User {
  @PrimaryColumn({ name: 'UsersAID', type: 'int4' })
  usersAID!: number;

  @Column({ name: 'Email', type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'FrstNme', type: 'varchar', length: 255, nullable: true })
  firstName?: string | null;

  @Column({ name: 'LastNme', type: 'varchar', length: 255, nullable: true })
  lastName?: string | null;

  @Column({ name: 'RecSts', type: 'char', length: 1, default: () => `'1'` })
  recSts!: string;

  @Column({ name: 'role', type: 'varchar', length: 20, default: 'member' })
  role!: string;
}
