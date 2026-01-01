import {
    Entity,
    Column,
    OneToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { SubscriptionPlan } from './enums';

@Entity('subscriptions')
@Index(['userId'])
@Index(['expiresAt'])
export class Subscription extends BaseEntity {
    @Column({ name: 'user_id' })
    userId: string;

    @OneToOne(() => User, (user) => user.subscription, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'enum', enum: SubscriptionPlan, default: SubscriptionPlan.FREE })
    plan: SubscriptionPlan;

    @Column({ name: 'started_at', type: 'timestamp', nullable: true })
    startedAt?: Date;

    @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
    expiresAt?: Date;

    @Column({ name: 'revenue_cat_id', nullable: true })
    revenueCatId?: string;

    @Column({ name: 'is_auto_renew', default: false })
    isAutoRenew: boolean;

    @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
    cancelledAt?: Date;
}
