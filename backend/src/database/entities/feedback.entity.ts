import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

export enum FeedbackType {
  BUG_REPORT = 'bug_report',
  FEATURE_REQUEST = 'feature_request',
  GENERAL_FEEDBACK = 'general_feedback',
}

export enum FeedbackStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

@Entity('feedbacks')
@Index(['status', 'createdAt'])
@Index(['userId', 'createdAt'])
export class Feedback extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: FeedbackType })
  type: FeedbackType;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: FeedbackStatus, default: FeedbackStatus.OPEN })
  status: FeedbackStatus;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes?: string;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy?: string;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt?: Date;
}
