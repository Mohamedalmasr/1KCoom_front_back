import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Project } from './project.entity';
import { Session as TaskSession } from '../../sessions/entities/session.entity';

@Entity({ name: 'tP_Task' })
export class Task {
  @PrimaryGeneratedColumn({ name: 'TaskAID', type: 'int4' })
  taskAID!: number;

  @Column({ name: 'TaskCode', type: 'varchar', length: 16, nullable: true })
  taskCode?: string | null;

  @Column({ name: 'TaskName', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'TaskDesc', type: 'varchar', length: 500, nullable: true })
  taskDesc?: string | null;

  @Index('IX_Task_ProjectFK')
  @Column({ name: 'ProjectFK', type: 'int4' })
  projectFK!: number;

  @ManyToOne(() => Project, (project) => project.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ProjectFK', referencedColumnName: 'projectAID' })
  project?: Project;

  @Column({ name: 'DateStrt', type: 'date', nullable: true })
  dateStrt?: string | null;

  @Column({ name: 'DateDue', type: 'date', nullable: true })
  dateDue?: string | null;

  @Column({ name: 'DateEnd', type: 'date', nullable: true })
  dateEnd?: string | null;

  @Column({ name: 'HoursEst', type: 'int4', nullable: true })
  hoursEst?: number | null;

  @Column({ name: 'HoursActual', type: 'int4', nullable: true })
  hoursActual?: number | null;

  @Column({ name: 'TaskSts', type: 'int4', default: 0 })
  taskSts!: number;

  // 3 = High, 2 = Medium, 1 = Low
  @Column({ name: 'TaskPriority', type: 'int2', default: 2 })
  taskPriority!: number;

  @Column({ name: 'RecSts', type: 'char', length: 1, default: () => `'1'` })
  recSts!: string;

  @OneToMany(() => TaskSession, (session) => session.task, { cascade: false })
  sessions?: TaskSession[];
}
