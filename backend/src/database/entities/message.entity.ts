import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Match } from './match.entity';

@Entity('messages')
@Index(['matchId', 'createdAt'])
@Index(['senderId', 'createdAt'])
export class Message extends BaseEntity {
  @Column({ name: 'match_id' })
  matchId: string;

  @ManyToOne(() => Match, (match) => match.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @Column({ name: 'sender_id' })
  senderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt?: Date;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @Column({ name: 'warning_type', nullable: true })
  warningType?: string; // 'external_link' | 'phone_number' | 'financial' | null
}
