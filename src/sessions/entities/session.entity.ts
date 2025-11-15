import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  ValueTransformer,
} from 'typeorm';
import { Task } from '../../projects/entities/task.entity';

const durationTransformer: ValueTransformer = {
  to: (value?: number | null) => (typeof value === 'number' ? value : 0),
  from: (value: string | number | null) =>
    value === null || value === undefined ? 0 : Number(value),
};

@Entity({ name: 'tp_TaskSession' })
@Index(['taskAID'])
@Index(['taskAID', 'usersAID'])
export class Session {
  @PrimaryGeneratedColumn({ name: 'SessionAID' })
  sessionAID: number;

  @Column({ name: 'TaskAID', type: 'int' })
  taskAID: number;

  @Column({ name: 'UsersAID', type: 'int' })
  usersAID: number;

  @ManyToOne(() => Task, (task) => task.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'TaskAID', referencedColumnName: 'taskAID' })
  task?: Task;

  @Column({ name: 'StartTime', type: 'timestamptz' })
  startTime: Date;

  @Column({ name: 'EndTime', type: 'timestamptz' })
  endTime: Date;

  @Column({ name: 'DurationMs', type: 'bigint', transformer: durationTransformer })
  durationMs: number;

  @Column({ name: 'Note', type: 'text', nullable: true })
  note?: string | null;

  @Column({
    name: 'CreatedAt',
    type: 'timestamptz',
    default: () => 'now()',
  })
  createdAt: Date;
}
