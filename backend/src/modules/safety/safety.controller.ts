import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
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
import { SafetyService } from './safety.service';
import {
    StartVerificationDto,
    SubmitVerificationDto,
    SubmitReportDto,
    BlockUserDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('safety')
@Controller('safety')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SafetyController {
    constructor(private readonly safetyService: SafetyService) { }

    // ==================== VIDEO VERIFICATION ====================

    @Post('verification/start')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Start video verification session' })
    @ApiResponse({ status: 200, description: 'Session started with phrase' })
    async startVerification(
        @CurrentUser('id') userId: string,
        @Body() dto: StartVerificationDto,
    ) {
        return this.safetyService.startVerification(userId, dto);
    }

    @Post('verification/submit')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Submit video verification' })
    @ApiResponse({ status: 200, description: 'Verification submitted' })
    async submitVerification(
        @CurrentUser('id') userId: string,
        @Body() dto: SubmitVerificationDto,
    ) {
        return this.safetyService.submitVerification(userId, dto);
    }

    @Get('verification/status')
    @ApiOperation({ summary: 'Get verification status' })
    @ApiResponse({ status: 200, description: 'Verification status' })
    async getVerificationStatus(@CurrentUser('id') userId: string) {
        return this.safetyService.getVerificationStatus(userId);
    }

    // ==================== SAFETY SCORE ====================

    @Get('score')
    @ApiOperation({ summary: 'Get safety score breakdown' })
    @ApiResponse({ status: 200, description: 'Safety score with breakdown' })
    async getSafetyScore(@CurrentUser('id') userId: string) {
        return this.safetyService.getSafetyScoreBreakdown(userId);
    }

    @Post('score/refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Recalculate safety score' })
    @ApiResponse({ status: 200, description: 'Safety score updated' })
    async refreshSafetyScore(@CurrentUser('id') userId: string) {
        const newScore = await this.safetyService.updateUserSafetyScore(userId);
        return { success: true, safetyScore: newScore };
    }

    // ==================== REPORTING ====================

    @Post('report')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Report a user' })
    @ApiResponse({ status: 201, description: 'Report submitted' })
    async reportUser(
        @CurrentUser('id') userId: string,
        @Body() dto: SubmitReportDto,
    ) {
        return this.safetyService.reportUser(userId, dto);
    }

    @Get('reports')
    @ApiOperation({ summary: 'Get my submitted reports' })
    @ApiResponse({ status: 200, description: 'List of reports' })
    async getMyReports(@CurrentUser('id') userId: string) {
        return this.safetyService.getMyReports(userId);
    }

    // ==================== BLOCKING ====================

    @Post('block')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Block a user' })
    @ApiResponse({ status: 200, description: 'User blocked' })
    async blockUser(
        @CurrentUser('id') userId: string,
        @Body() dto: BlockUserDto,
    ) {
        return this.safetyService.blockUser(userId, dto.userId);
    }

    @Delete('block/:userId')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Unblock a user' })
    @ApiResponse({ status: 200, description: 'User unblocked' })
    async unblockUser(
        @CurrentUser('id') userId: string,
        @Param('userId') blockedUserId: string,
    ) {
        return this.safetyService.unblockUser(userId, blockedUserId);
    }

    @Get('blocked')
    @ApiOperation({ summary: 'Get blocked users' })
    @ApiResponse({ status: 200, description: 'List of blocked users' })
    async getBlockedUsers(@CurrentUser('id') userId: string) {
        return this.safetyService.getBlockedUsers(userId);
    }
}
