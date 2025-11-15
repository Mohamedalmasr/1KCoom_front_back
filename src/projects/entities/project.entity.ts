import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Task } from './task.entity';

@Entity({ name: 'tP_Project' })
export class Project {
  @PrimaryGeneratedColumn({ name: 'ProjectAID', type: 'int4' })
  projectAID!: number;

  @Column({ name: 'ProjectCode', type: 'varchar', length: 16 })
  projectCode!: string;

  @Column({ name: 'ProjectName', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'ProjectDesc', type: 'varchar', length: 5000, nullable: true })
  projectDesc?: string | null;

  @Column({ name: 'RecSts', type: 'char', length: 1, default: () => `'1'` })
  recSts!: string;

  @Column({ name: 'LeaderAID', type: 'int4', nullable: true })
  leaderAID?: number | null;

  @Column({ name: 'Type', type: 'varchar', length: 50 })
  type!: string;

  @Column({ name: 'StartDate', type: 'date', nullable: true })
  startDate?: string | null;

  @Column({ name: 'DueDate', type: 'date', nullable: true })
  dueDate?: string | null;

  // Postgres numeric يُعاد كنص
  @Column({ name: 'Budget', type: 'numeric', precision: 12, scale: 2, default: 0 })
  budget!: string;

  @Column({ name: 'Status', type: 'varchar', length: 20, default: 'On Track' })
  status!: string;

  @Column({ name: 'UpdatedAt', type: 'timestamptz', default: () => 'now()' })
  updatedAt!: Date;

  @OneToMany(() => Task, (task) => task.project)
  tasks?: Task[];
}
