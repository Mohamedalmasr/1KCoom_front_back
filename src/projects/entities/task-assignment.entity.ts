import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: '0' })
export class TaskAssignment {
  @PrimaryColumn({ name: 'TaskAID', type: 'int4' })
  taskAID!: number;

  @PrimaryColumn({ name: 'UsersAID', type: 'int4' })
  usersAID!: number;

  @Column({ name: 'Role', type: 'varchar', length: 50, nullable: true })
  role?: string | null;

  @Column({ name: 'AssignedAt', type: 'timestamptz', default: () => 'now()' })
  assignedAt!: Date;
}
