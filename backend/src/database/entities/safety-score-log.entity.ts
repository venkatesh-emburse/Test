import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { ScoreChangeCategory } from './enums';

@Entity('safety_score_logs')
@Index(['userId', 'createdAt'])
export class SafetyScoreLog extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'previous_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  previousScore: number;

  @Column({
    name: 'new_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  newScore: number;

  @Column({
    name: 'change_amount',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  changeAmount: number;

  @Column()
  reason: string;

  @Column({
    type: 'enum',
    enum: ScoreChangeCategory,
  })
  category: ScoreChangeCategory;
}
