import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  Unique,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Message } from './message.entity';

@Entity('matches')
@Unique(['user1Id', 'user2Id'])
@Index(['user1Id', 'matchedAt'])
@Index(['user2Id', 'matchedAt'])
export class Match extends BaseEntity {
  @Column({ name: 'user1_id' })
  user1Id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user1_id' })
  user1: User;

  @Column({ name: 'user2_id' })
  user2Id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user2_id' })
  user2: User;

  @Column({
    name: 'matched_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  matchedAt: Date;

  // Micro-date tracking
  @Column({ name: 'micro_date_game', nullable: true })
  microDateGame?: string; // e.g., 'two_truths_lie', 'would_you_rather'

  @Column({ name: 'user1_answer', type: 'jsonb', nullable: true })
  user1Answer?: Record<string, any>;

  @Column({ name: 'user2_answer', type: 'jsonb', nullable: true })
  user2Answer?: Record<string, any>;

  @Column({ name: 'micro_date_completed', default: false })
  microDateCompleted: boolean;

  @Column({ name: 'chat_unlocked', default: false })
  chatUnlocked: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'unmatched_at', type: 'timestamp', nullable: true })
  unmatchedAt?: Date;

  @Column({ name: 'unmatched_by', nullable: true })
  unmatchedBy?: string;

  @OneToMany(() => Message, (message) => message.match)
  messages?: Message[];
}
