import {
    Entity,
    Column,
    Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { FeatureKey, SubscriptionPlan } from './enums';

/**
 * FeatureConfig - Admin-configurable feature settings
 * 
 * This table allows super admin to customize:
 * - Feature limits (swipes per day, radius, etc.)
 * - Pricing for paid features
 * - Enable/disable features per plan
 * 
 * No code changes needed to modify these values!
 */
@Entity('feature_configs')
@Index(['featureKey', 'plan'], { unique: true })
export class FeatureConfig extends BaseEntity {
    @Column({ name: 'feature_key', type: 'enum', enum: FeatureKey })
    featureKey: FeatureKey;

    @Column({ type: 'enum', enum: SubscriptionPlan })
    plan: SubscriptionPlan;

    @Column({ type: 'int', nullable: true })
    limitValue?: number; // For numeric limits (swipes, radius, etc.)

    @Column({ type: 'boolean', nullable: true })
    isEnabled?: boolean; // For boolean features (undo, see who liked, etc.)

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    price?: number; // For purchasable features (intent change, badges)

    @Column({ nullable: true })
    currency?: string; // INR, USD, etc.

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;
}
