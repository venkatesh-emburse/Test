import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { PremiumService } from './premium.service';
import {
    CreateSubscriptionDto,
    RevenueCatWebhookDto,
    CheckFeatureDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('premium')
@Controller('premium')
export class PremiumController {
    constructor(private readonly premiumService: PremiumService) { }

    // ==================== SUBSCRIPTION STATUS ====================

    @Get('status')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current subscription status' })
    @ApiResponse({ status: 200, description: 'Subscription status with features' })
    async getSubscriptionStatus(@CurrentUser('id') userId: string) {
        return this.premiumService.getSubscriptionStatus(userId);
    }

    // ==================== FEATURES ====================

    @Get('features')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get features for current plan' })
    @ApiResponse({ status: 200, description: 'Plan features' })
    async getFeatures(@CurrentUser('id') userId: string) {
        const status = await this.premiumService.getSubscriptionStatus(userId);
        return status.features;
    }

    @Get('check-feature')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Check if a specific feature is enabled' })
    @ApiResponse({ status: 200, description: 'Feature check result' })
    async checkFeature(
        @CurrentUser('id') userId: string,
        @Query('key') featureKey: string,
    ) {
        return this.premiumService.checkFeature(userId, featureKey);
    }

    // ==================== UPGRADE ====================

    @Get('upgrade-prompt')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get upgrade prompt with pricing' })
    @ApiResponse({ status: 200, description: 'Upgrade prompt details' })
    async getUpgradePrompt() {
        return this.premiumService.getUpgradePrompt();
    }

    // ==================== SUBSCRIPTION MANAGEMENT ====================

    @Post('subscribe')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create subscription (for testing/manual)' })
    @ApiResponse({ status: 201, description: 'Subscription created' })
    async createSubscription(
        @CurrentUser('id') userId: string,
        @Body() dto: CreateSubscriptionDto,
    ) {
        return this.premiumService.createSubscription(userId, dto);
    }

    @Post('cancel')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Cancel subscription (keeps access until expiry)' })
    @ApiResponse({ status: 200, description: 'Subscription cancelled' })
    async cancelSubscription(@CurrentUser('id') userId: string) {
        return this.premiumService.cancelSubscription(userId);
    }

    // ==================== DAILY LIMITS ====================

    @Get('limits/swipes')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Check remaining daily swipes' })
    @ApiResponse({ status: 200, description: 'Swipe limit status' })
    async checkSwipeLimit(@CurrentUser('id') userId: string) {
        return this.premiumService.checkDailySwipeLimit(userId);
    }

    @Get('limits/super-likes')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Check remaining daily super likes' })
    @ApiResponse({ status: 200, description: 'Super like limit status' })
    async checkSuperLikeLimit(@CurrentUser('id') userId: string) {
        return this.premiumService.checkDailySuperLikeLimit(userId);
    }

    // ==================== REVENUECAT WEBHOOK ====================

    @Post('webhook/revenuecat')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'RevenueCat webhook endpoint' })
    @ApiResponse({ status: 200, description: 'Webhook processed' })
    async handleRevenueCatWebhook(@Body() payload: RevenueCatWebhookDto) {
        return this.premiumService.handleRevenueCatWebhook(payload);
    }
}
