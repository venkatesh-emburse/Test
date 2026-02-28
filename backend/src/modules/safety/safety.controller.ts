import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
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
import { SafetyService } from './safety.service';
import {
  StartVerificationDto,
  SubmitVerificationDto,
  StartSelfieVerificationDto,
  SubmitSelfieVerificationDto,
  ReviewVerificationDto,
  SubmitReportDto,
  BlockUserDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';
import {
  VerificationStatus,
  VerificationType,
} from '../../database/entities/enums';

@ApiTags('safety')
@Controller('safety')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SafetyController {
  constructor(private readonly safetyService: SafetyService) {}

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

  // ==================== SELFIE VERIFICATION ====================

  @Post('selfie/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start selfie verification session' })
  @ApiResponse({
    status: 200,
    description: 'Selfie session started with challenge code',
  })
  async startSelfieVerification(
    @CurrentUser('id') userId: string,
    @Body() dto: StartSelfieVerificationDto,
  ) {
    return this.safetyService.startSelfieVerification(userId, dto);
  }

  @Post('selfie/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit selfie verification' })
  @ApiResponse({ status: 200, description: 'Selfie verification submitted' })
  async submitSelfieVerification(
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitSelfieVerificationDto,
  ) {
    return this.safetyService.submitSelfieVerification(userId, dto);
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

  @Get('score/history')
  @ApiOperation({ summary: 'Get safety score change history' })
  @ApiResponse({ status: 200, description: 'Score change history' })
  async getScoreHistory(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.safetyService.getScoreHistory(userId, parsedLimit, parsedOffset);
  }

  // ==================== ADMIN REVIEW ====================

  @Public()
  @UseGuards(AdminApiKeyGuard)
  @Get('admin/verifications')
  @ApiOperation({ summary: 'List verifications for admin review' })
  @ApiResponse({ status: 200, description: 'List of verifications' })
  async getVerificationsForAdmin(
    @Query('status') status?: VerificationStatus,
    @Query('type') type?: VerificationType,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.safetyService.getVerificationsForAdmin(
      status,
      type,
      parsedLimit,
    );
  }

  @Public()
  @UseGuards(AdminApiKeyGuard)
  @Post('admin/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Review a verification (approve/deny)' })
  @ApiResponse({ status: 200, description: 'Verification reviewed' })
  async reviewVerification(@Body() dto: ReviewVerificationDto) {
    return this.safetyService.reviewVerification(dto);
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
