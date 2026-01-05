import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan } from '../../../database/entities/enums';

// ==================== REQUEST DTOs ====================

// Create/Update Subscription DTO (from RevenueCat webhook)
export class CreateSubscriptionDto {
    @ApiProperty({ enum: SubscriptionPlan })
    @IsEnum(SubscriptionPlan)
    plan: SubscriptionPlan;

    @ApiPropertyOptional({ description: 'RevenueCat subscription ID' })
    @IsOptional()
    @IsString()
    revenuecatId?: string;

    @ApiPropertyOptional({ description: 'Original transaction ID' })
    @IsOptional()
    @IsString()
    originalTransactionId?: string;
}

// RevenueCat Webhook DTO
export class RevenueCatWebhookDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    event_type: string;

    @ApiProperty()
    app_user_id: string;

    @ApiPropertyOptional()
    product_id?: string;

    @ApiPropertyOptional()
    entitlement_id?: string;

    @ApiPropertyOptional()
    original_transaction_id?: string;

    @ApiPropertyOptional()
    expiration_at_ms?: number;

    @ApiPropertyOptional()
    is_trial_conversion?: boolean;
}

// Feature Check DTO
export class CheckFeatureDto {
    @ApiProperty({ description: 'Feature key to check' })
    @IsString()
    @IsNotEmpty()
    featureKey: string;
}

// ==================== RESPONSE DTOs ====================

// Must be defined BEFORE SubscriptionStatusDto
export class PremiumFeaturesDto {
    @ApiProperty({ description: 'Daily swipe limit' })
    swipesPerDay: number;

    @ApiProperty({ description: 'Super likes per day' })
    superLikesPerDay: number;

    @ApiProperty({ description: 'Can undo last swipe' })
    undoSwipe: boolean;

    @ApiProperty({ description: 'See who liked you' })
    seeWhoLiked: boolean;

    @ApiProperty({ description: 'Read receipts in chat' })
    readReceipts: boolean;

    @ApiProperty({ description: 'Last active filter in discovery' })
    lastActiveFilter: boolean;

    @ApiProperty({ description: 'Safety score filter' })
    safetyScoreFilter: boolean;

    @ApiProperty({ description: 'Max discovery radius (km)' })
    maxRadiusKm: number;

    @ApiProperty({ description: 'Map profiles limit' })
    mapProfilesLimit: number;

    @ApiProperty({ description: 'Priority in discovery' })
    priorityDiscovery: boolean;

    @ApiProperty({ description: 'No ads' })
    noAds: boolean;
}

export class SubscriptionStatusDto {
    @ApiProperty({ enum: SubscriptionPlan })
    currentPlan: SubscriptionPlan;

    @ApiProperty()
    isActive: boolean;

    @ApiPropertyOptional()
    expiresAt?: Date;

    @ApiProperty()
    features: PremiumFeaturesDto;

    @ApiPropertyOptional()
    daysRemaining?: number;

    @ApiProperty()
    canUpgrade: boolean;
}

export class FeatureCheckResultDto {
    @ApiProperty()
    featureKey: string;

    @ApiProperty()
    isEnabled: boolean;

    @ApiProperty()
    value?: number | boolean | string;

    @ApiPropertyOptional()
    upgradeMessage?: string;
}

export class UpgradePromptDto {
    @ApiProperty()
    title: string;

    @ApiProperty()
    message: string;

    @ApiProperty()
    features: string[];

    @ApiProperty()
    pricing: {
        monthly: number;
        yearly: number;
        currency: string;
    };
}

// Feature limits by plan
// MVP: All features are FREE but with configurable rate limits
export const PLAN_FEATURES: Record<SubscriptionPlan, PremiumFeaturesDto> = {
    [SubscriptionPlan.FREE]: {
        // MVP: Generous limits for free users (configurable)
        swipesPerDay: 50,        // Daily swipe limit
        superLikesPerDay: 5,     // Super likes per day
        undoSwipe: true,         // Allow undo
        seeWhoLiked: true,       // See who liked you
        readReceipts: true,      // Read receipts in chat
        lastActiveFilter: true,  // Last active filter
        safetyScoreFilter: true, // Safety score filter
        maxRadiusKm: 100,        // Max discovery radius
        mapProfilesLimit: 50,    // Map profiles limit
        priorityDiscovery: true, // Priority in discovery
        noAds: true,             // No ads for MVP
    },
    // Premium plan (keep for future monetization)
    [SubscriptionPlan.PREMIUM]: {
        swipesPerDay: 999, // Unlimited
        superLikesPerDay: 10,
        undoSwipe: true,
        seeWhoLiked: true,
        readReceipts: true,
        lastActiveFilter: true,
        safetyScoreFilter: true,
        maxRadiusKm: 200,
        mapProfilesLimit: 100,
        priorityDiscovery: true,
        noAds: true,
    },
};
