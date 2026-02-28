import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { SignalType } from './enums';

@Entity('signals')
@Unique(['senderId', 'receiverId', 'signalType'])
@Index(['receiverId', 'createdAt'])
export class Signal extends BaseEntity {
  @Column({ name: 'sender_id' })
  senderId: string;

  @ManyToOne(() => User, (user) => user.signalsSent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ name: 'receiver_id' })
  receiverId: string;

  @ManyToOne(() => User, (user) => user.signalsReceived, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'receiver_id' })
  receiver: User;

  @Column({ name: 'signal_type', type: 'enum', enum: SignalType })
  signalType: SignalType;

  @Column({ name: 'is_seen', default: false })
  isSeen: boolean;
}
