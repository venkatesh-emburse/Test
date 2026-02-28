import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { FeedbackService } from '../feedback/feedback.service';
import { UpdateFeedbackStatusDto } from '../feedback/dto/feedback.dto';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { AdminRoles } from './decorators/admin-roles.decorator';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import { AdminRole, VerificationStatus, UserIntent } from '../../database/entities/enums';
import {
  CreateAdminDto,
  UpdateAdminDto,
  ReviewReportDto,
  UpdateAppUserDto,
  AdjustScoreDto,
} from './dto/admin-login.dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly feedbackService: FeedbackService,
  ) {}

  // ==================== DASHBOARD ====================

  @Get('dashboard/stats')
  @AdminRoles(AdminRole.SUPPORT)
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ==================== APP USER MANAGEMENT ====================

  @Get('users')
  @AdminRoles(AdminRole.SUPPORT)
  @ApiOperation({ summary: 'List app users (paginated, searchable)' })
  async listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('intent') intent?: UserIntent,
    @Query('isVerified') isVerified?: string,
    @Query('isSuspended') isSuspended?: string,
    @Query('isBanned') isBanned?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.adminService.listUsers({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      intent,
      isVerified,
      isSuspended,
      isBanned,
      sortBy,
      sortOrder,
    });
  }

  @Get('users/:id')
  @AdminRoles(AdminRole.SUPPORT)
  @ApiOperation({ summary: 'Get user details' })
  async getUserDetail(@Param('id') userId: string) {
    return this.adminService.getUserDetail(userId);
  }

  @Patch('users/:id')
  @AdminRoles(AdminRole.ADMIN)
  @ApiOperation({ summary: 'Update app user (ban/suspend/verify)' })
  async updateAppUser(
    @Param('id') userId: string,
    @Body() dto: UpdateAppUserDto,
  ) {
    return this.adminService.updateAppUser(userId, dto);
  }

  @Post('users/:id/adjust-score')
  @AdminRoles(AdminRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually adjust user safety score' })
  async adjustScore(
    @Param('id') userId: string,
    @Body() dto: AdjustScoreDto,
  ) {
    return this.adminService.adjustScore(userId, dto);
  }

  // ==================== VERIFICATION MANAGEMENT ====================

  @Get('verifications')
  @AdminRoles(AdminRole.SUPPORT)
  @ApiOperation({ summary: 'List verifications (paginated, filterable)' })
  async listVerifications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: VerificationStatus,
    @Query('type') type?: string,
  ) {
    return this.adminService.listVerifications({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      type: type as any,
    });
  }

  @Get('verifications/:id')
  @AdminRoles(AdminRole.SUPPORT)
  @ApiOperation({ summary: 'Get verification details' })
  async getVerificationDetail(@Param('id') verificationId: string) {
    return this.adminService.getVerificationDetail(verificationId);
  }

  @Post('verifications/:id/review')
  @AdminRoles(AdminRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Review a verification (approve/reject)' })
  async reviewVerification(
    @Param('id') verificationId: string,
    @Body() body: { status: VerificationStatus; notes?: string },
  ) {
    return this.adminService.reviewVerification(
      verificationId,
      body.status,
      body.notes,
    );
  }

  // ==================== REPORT MANAGEMENT ====================

  @Get('reports')
  @AdminRoles(AdminRole.SUPPORT)
  @ApiOperation({ summary: 'List reports (paginated, filterable)' })
  async listReports(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isReviewed') isReviewed?: string,
    @Query('reason') reason?: string,
  ) {
    return this.adminService.listReports({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      isReviewed,
      reason,
    });
  }

  @Get('reports/:id')
  @AdminRoles(AdminRole.SUPPORT)
  @ApiOperation({ summary: 'Get report details' })
  async getReportDetail(@Param('id') reportId: string) {
    return this.adminService.getReportDetail(reportId);
  }

  @Post('reports/:id/review')
  @AdminRoles(AdminRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Review a report' })
  async reviewReport(
    @Param('id') reportId: string,
    @CurrentAdmin('id') adminId: string,
    @Body() dto: ReviewReportDto,
  ) {
    return this.adminService.reviewReport(reportId, adminId, dto);
  }

  // ==================== ADMIN TEAM MANAGEMENT ====================

  @Get('team')
  @AdminRoles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List admin team members' })
  async listAdminTeam() {
    return this.adminService.listAdminTeam();
  }

  @Post('team')
  @AdminRoles(AdminRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new admin user' })
  async createAdmin(@Body() dto: CreateAdminDto) {
    return this.adminService.createAdmin(dto);
  }

  @Patch('team/:id')
  @AdminRoles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update admin user' })
  async updateAdmin(
    @Param('id') adminId: string,
    @Body() dto: UpdateAdminDto,
  ) {
    return this.adminService.updateAdmin(adminId, dto);
  }

  @Delete('team/:id')
  @AdminRoles(AdminRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate admin user' })
  async deactivateAdmin(
    @Param('id') adminId: string,
    @CurrentAdmin('id') currentAdminId: string,
  ) {
    return this.adminService.deactivateAdmin(adminId, currentAdminId);
  }

  // ==================== FEEDBACK MANAGEMENT ====================

  @Get('feedbacks')
  @AdminRoles(AdminRole.SUPPORT)
  @ApiOperation({ summary: 'List user feedbacks (paginated, filterable)' })
  async listFeedbacks(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.feedbackService.list({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      type,
    });
  }

  @Patch('feedbacks/:id')
  @AdminRoles(AdminRole.SUPPORT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update feedback status' })
  async updateFeedbackStatus(
    @Param('id') feedbackId: string,
    @CurrentAdmin('id') adminId: string,
    @Body() dto: UpdateFeedbackStatusDto,
  ) {
    return this.feedbackService.updateStatus(feedbackId, adminId, dto);
  }
}
