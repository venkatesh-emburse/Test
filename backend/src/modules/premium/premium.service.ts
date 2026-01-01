import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../database/entities/user.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { FeatureConfig } from '../../database/entities/feature-config.entity';
import { SubscriptionPlan, FeatureKey } from '../../database/entities/enums';
import {
    CreateSubscriptionDto,
    RevenueCatWebhookDto,
    SubscriptionStatusDto,
    PremiumFeaturesDto,
    FeatureCheckResultDto,
    UpgradePromptDto,
    PLAN_FEATURES,
} from './dto';

@Injectable()
export class PremiumService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Subscription)
        private subscriptionRepository: Repository<Subscription>,
        @InjectRepository(FeatureConfig)
        private featureConfigRepository: Repository<FeatureConfig>,
    ) { }

    // ==================== SUBSCRIPTION STATUS ====================

    async getSubscriptionStatus(userId: string): Promise<SubscriptionStatusDto> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const subscription = await this.subscriptionRepository.findOne({
            where: { userId },
            order: { createdAt: 'DESC' },
        });

        const currentPlan = user.currentPlan;
        const features = await this.getPlanFeatures(currentPlan);

        let isActive = false;
        let expiresAt: Date | undefined;
        let daysRemaining: number | undefined;

        if (subscription && subscription.expiresAt) {
            isActive = new Date() < subscription.expiresAt;
            expiresAt = subscription.expiresAt;
            daysRemaining = isActive
                ? Math.ceil((subscription.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : 0;
        }

        return {
            currentPlan,
            isActive: currentPlan === SubscriptionPlan.PREMIUM && isActive,
            expiresAt,
            features,
            daysRemaining,
            canUpgrade: currentPlan === SubscriptionPlan.FREE,
        };
    }

    // ==================== PLAN FEATURES ====================

    async getPlanFeatures(plan: SubscriptionPlan): Promise<PremiumFeaturesDto> {
        // Check for custom feature configs in database
        const customConfigs = await this.featureConfigRepository.find({
            where: { plan, isActive: true },
        });

        // Start with default plan features
        const features = { ...PLAN_FEATURES[plan] };

        // Override with custom configs if any
        for (const config of customConfigs) {
            switch (config.featureKey) {
                case FeatureKey.SWIPES_PER_DAY:
                    if (config.limitValue !== undefined) features.swipesPerDay = config.limitValue;
                    break;
                case FeatureKey.SUPER_LIKES_PER_DAY:
                    if (config.limitValue !== undefined) features.superLikesPerDay = config.limitValue;
                    break;
                case FeatureKey.UNDO_SWIPE:
                    if (config.isEnabled !== undefined) features.undoSwipe = config.isEnabled;
                    break;
                case FeatureKey.SEE_WHO_LIKED:
                    if (config.isEnabled !== undefined) features.seeWhoLiked = config.isEnabled;
                    break;
                case FeatureKey.READ_RECEIPTS:
                    if (config.isEnabled !== undefined) features.readReceipts = config.isEnabled;
                    break;
                case FeatureKey.MAX_RADIUS_KM:
                    if (config.limitValue !== undefined) features.maxRadiusKm = config.limitValue;
                    break;
                case FeatureKey.MAP_PROFILES_LIMIT:
                    if (config.limitValue !== undefined) features.mapProfilesLimit = config.limitValue;
                    break;
            }
        }

        return features;
    }

    // ==================== FEATURE CHECK ====================

    async checkFeature(userId: string, featureKey: string): Promise<FeatureCheckResultDto> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const features = await this.getPlanFeatures(user.currentPlan);
        let isEnabled = false;
        let value: number | boolean | string | undefined;
        let upgradeMessage: string | undefined;

        switch (featureKey) {
            case 'swipes_per_day':
                isEnabled = true;
                value = features.swipesPerDay;
                break;
            case 'super_likes':
                isEnabled = true;
                value = features.superLikesPerDay;
                break;
            case 'undo_swipe':
                isEnabled = features.undoSwipe;
                upgradeMessage = !isEnabled ? 'Upgrade to Premium to undo your last swipe!' : undefined;
                break;
            case 'see_who_liked':
                isEnabled = features.seeWhoLiked;
                upgradeMessage = !isEnabled ? 'Upgrade to Premium to see who liked you!' : undefined;
                break;
            case 'read_receipts':
                isEnabled = features.readReceipts;
                upgradeMessage = !isEnabled ? 'Upgrade to Premium for read receipts!' : undefined;
                break;
            case 'priority_discovery':
                isEnabled = features.priorityDiscovery;
                upgradeMessage = !isEnabled ? 'Upgrade to Premium for priority in discovery!' : undefined;
                break;
            case 'no_ads':
                isEnabled = features.noAds;
                upgradeMessage = !isEnabled ? 'Upgrade to Premium for an ad-free experience!' : undefined;
                break;
            default:
                isEnabled = false;
                upgradeMessage = 'Unknown feature';
        }

        return {
            featureKey,
            isEnabled,
            value,
            upgradeMessage,
        };
    }

    // ==================== UPGRADE PROMPT ====================

    async getUpgradePrompt(): Promise<UpgradePromptDto> {
        return {
            title: 'Upgrade to LiveConnect Premium',
            message: 'Unlock exclusive features and find your match faster!',
            features: [
                'Unlimited swipes',
                '5 super likes per day',
                'See who liked you',
                'Read receipts in chat',
                'Priority in discovery',
                'Undo last swipe',
                'Advanced filters',
                'No ads',
            ],
            pricing: {
                monthly: 499, // INR
                yearly: 2999, // INR (50% savings)
                currency: 'INR',
            },
        };
    }

    // ==================== SUBSCRIPTION MANAGEMENT ====================

    async createSubscription(userId: string, dto: CreateSubscriptionDto) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Create subscription record
        const subscription = new Subscription();
        subscription.userId = userId;
        subscription.plan = dto.plan;
        subscription.startedAt = new Date();
        subscription.expiresAt = this.calculateExpiryDate(dto.plan);
        subscription.revenueCatId = dto.revenuecatId;
        subscription.isAutoRenew = true;

        await this.subscriptionRepository.save(subscription);

        // Update user plan
        await this.userRepository.update(userId, { currentPlan: dto.plan });

        return {
            success: true,
            subscription: {
                id: subscription.id,
                plan: subscription.plan,
                startedAt: subscription.startedAt,
                expiresAt: subscription.expiresAt,
            },
        };
    }

    async cancelSubscription(userId: string) {
        const subscription = await this.subscriptionRepository.findOne({
            where: { userId },
            order: { createdAt: 'DESC' },
        });

        if (!subscription) {
            throw new NotFoundException('No active subscription found');
        }

        // Mark as cancelled (will expire at end of period)
        subscription.isAutoRenew = false;
        subscription.cancelledAt = new Date();
        await this.subscriptionRepository.save(subscription);

        return {
            success: true,
            message: 'Subscription cancelled. You will retain access until ' +
                subscription.expiresAt?.toLocaleDateString(),
            expiresAt: subscription.expiresAt,
        };
    }

    // ==================== REVENUECAT WEBHOOK ====================

    async handleRevenueCatWebhook(payload: RevenueCatWebhookDto) {
        const { event_type, app_user_id, expiration_at_ms } = payload;

        const user = await this.userRepository.findOne({
            where: { id: app_user_id },
        });

        if (!user) {
            console.log(`RevenueCat webhook: User not found: ${app_user_id}`);
            return { received: true };
        }

        switch (event_type) {
            case 'INITIAL_PURCHASE':
            case 'RENEWAL':
                await this.activateSubscription(user.id, expiration_at_ms);
                break;

            case 'CANCELLATION':
                await this.cancelSubscription(user.id);
                break;

            case 'EXPIRATION':
                await this.expireSubscription(user.id);
                break;

            case 'BILLING_ISSUE':
                console.log(`Billing issue for user: ${user.id}`);
                break;
        }

        return { received: true };
    }

    // ==================== DAILY LIMITS ====================

    async checkDailySwipeLimit(userId: string): Promise<{ canSwipe: boolean; remaining: number }> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const features = await this.getPlanFeatures(user.currentPlan);
        const remaining = Math.max(0, features.swipesPerDay - user.swipesToday);

        return {
            canSwipe: remaining > 0,
            remaining,
        };
    }

    async checkDailySuperLikeLimit(userId: string): Promise<{ canSuperLike: boolean; remaining: number }> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const features = await this.getPlanFeatures(user.currentPlan);
        const remaining = Math.max(0, features.superLikesPerDay - user.superLikesToday);

        return {
            canSuperLike: remaining > 0,
            remaining,
        };
    }

    // ==================== HELPER METHODS ====================

    private calculateExpiryDate(plan: SubscriptionPlan): Date {
        const now = new Date();
        // Default to 1 month subscription
        return new Date(now.setMonth(now.getMonth() + 1));
    }

    private async activateSubscription(userId: string, expirationMs?: number) {
        const expiresAt = expirationMs
            ? new Date(expirationMs)
            : this.calculateExpiryDate(SubscriptionPlan.PREMIUM);

        // Find or create subscription
        let subscription = await this.subscriptionRepository.findOne({
            where: { userId },
            order: { createdAt: 'DESC' },
        });

        if (subscription) {
            subscription.expiresAt = expiresAt;
            subscription.plan = SubscriptionPlan.PREMIUM;
            subscription.isAutoRenew = true;
        } else {
            subscription = new Subscription();
            subscription.userId = userId;
            subscription.plan = SubscriptionPlan.PREMIUM;
            subscription.startedAt = new Date();
            subscription.expiresAt = expiresAt;
            subscription.isAutoRenew = true;
        }

        await this.subscriptionRepository.save(subscription);
        await this.userRepository.update(userId, { currentPlan: SubscriptionPlan.PREMIUM });
    }

    private async expireSubscription(userId: string) {
        await this.userRepository.update(userId, { currentPlan: SubscriptionPlan.FREE });
    }
}
