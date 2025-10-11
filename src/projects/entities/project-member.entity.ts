import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'tP_ProjectMember' })
export class ProjectMember {
  @PrimaryColumn({ name: 'ProjectAID', type: 'int4' })
  projectAID!: number;

  @PrimaryColumn({ name: 'UsersAID', type: 'int4' })
  usersAID!: number;

  @Column({ name: 'Role', type: 'varchar', length: 50, nullable: true })
  role?: string | null;

  @Column({ name: 'AssignedAt', type: 'timestamptz', default: () => 'now()' })
  assignedAt!: Date;
}
