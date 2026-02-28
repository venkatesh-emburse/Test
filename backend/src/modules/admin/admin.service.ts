import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../../database/entities/user.entity';
import { Profile } from '../../database/entities/profile.entity';
import { AdminUser } from '../../database/entities/admin-user.entity';
import { SafetyVerification } from '../../database/entities/safety-verification.entity';
import { SafetyScoreLog } from '../../database/entities/safety-score-log.entity';
import { Report } from '../../database/entities/report.entity';
import { Match } from '../../database/entities/match.entity';
import {
  VerificationStatus,
  VerificationType,
  AdminRole,
  UserIntent,
  ScoreChangeCategory,
} from '../../database/entities/enums';
import {
  CreateAdminDto,
  UpdateAdminDto,
  ReviewReportDto,
  UpdateAppUserDto,
  AdjustScoreDto,
} from './dto/admin-login.dto';
import { SafetyService } from '../safety/safety.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(AdminUser)
    private adminRepository: Repository<AdminUser>,
    @InjectRepository(SafetyVerification)
    private verificationRepository: Repository<SafetyVerification>,
    @InjectRepository(SafetyScoreLog)
    private scoreLogRepository: Repository<SafetyScoreLog>,
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    private safetyService: SafetyService,
  ) {}

  // ==================== DASHBOARD ====================

  async getDashboardStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      pendingVerifications,
      openReports,
      verifiedUsers,
      activeToday,
      newThisWeek,
      suspendedUsers,
      matchesToday,
    ] = await Promise.all([
      this.userRepository.count(),
      this.verificationRepository.count({
        where: { verificationStatus: VerificationStatus.PENDING },
      }),
      this.reportRepository.count({ where: { isReviewed: false } }),
      this.userRepository.count({ where: { isVerified: true } }),
      this.userRepository.count({
        where: { lastActiveAt: MoreThan(todayStart) },
      }),
      this.userRepository.count({
        where: { createdAt: MoreThan(weekAgo) },
      }),
      this.userRepository.count({ where: { isSuspended: true } }),
      this.matchRepository.count({
        where: { createdAt: MoreThan(todayStart) },
      }),
    ]);

    return {
      totalUsers,
      pendingVerifications,
      openReports,
      verifiedUsers,
      activeToday,
      newThisWeek,
      suspendedUsers,
      matchesToday,
    };
  }

  // ==================== APP USER MANAGEMENT ====================

  async listUsers(query: {
    page?: number;
    limit?: number;
    search?: string;
    intent?: UserIntent;
    isVerified?: string;
    isSuspended?: string;
    isBanned?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile');

    // Search
    if (query.search) {
      qb.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Filters
    if (query.intent) {
      qb.andWhere('user.intent = :intent', { intent: query.intent });
    }
    if (query.isVerified === 'true') {
      qb.andWhere('user.isVerified = true');
    } else if (query.isVerified === 'false') {
      qb.andWhere('user.isVerified = false');
    }
    if (query.isSuspended === 'true') {
      qb.andWhere('user.isSuspended = true');
    } else if (query.isSuspended === 'false') {
      qb.andWhere('user.isSuspended = false');
    }
    if (query.isBanned === 'true') {
      qb.andWhere('user.isBanned = true');
    } else if (query.isBanned === 'false') {
      qb.andWhere('user.isBanned = false');
    }

    // Sorting
    const sortField = ['createdAt', 'safetyScore', 'name'].includes(query.sortBy || '')
      ? `user.${query.sortBy}`
      : 'user.createdAt';
    const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(sortField, sortOrder);

    qb.skip(skip).take(limit);

    const [users, total] = await qb.getManyAndCount();

    return {
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        gender: u.gender,
        intent: u.intent,
        safetyScore: Number(u.safetyScore),
        isVerified: u.isVerified,
        isSuspended: u.isSuspended,
        isBanned: u.isBanned,
        isActive: u.isActive,
        lastActiveAt: u.lastActiveAt,
        createdAt: u.createdAt,
        photo: u.profile?.photos?.[0] || null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get safety score breakdown
    const scoreBreakdown = await this.safetyService.getSafetyScoreBreakdown(userId);

    // Get verification history
    const verifications = await this.verificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // Get reports received
    const reportsReceived = await this.reportRepository.find({
      where: { reportedId: userId },
      order: { createdAt: 'DESC' },
      take: 10,
      relations: ['reporter'],
    });

    // Get reports filed
    const reportsFiled = await this.reportRepository.find({
      where: { reporterId: userId },
      order: { createdAt: 'DESC' },
      take: 10,
      relations: ['reported'],
    });

    // Get score history
    const scoreHistory = await this.scoreLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 15,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        intent: user.intent,
        safetyScore: Number(user.safetyScore),
        isVerified: user.isVerified,
        isSuspended: user.isSuspended,
        suspendedAt: user.suspendedAt,
        isBanned: user.isBanned,
        isActive: user.isActive,
        lastActiveAt: user.lastActiveAt,
        phoneVerified: user.phoneVerified,
        emailVerified: user.emailVerified,
        swipeWarningCount: user.swipeWarningCount,
        createdAt: user.createdAt,
      },
      profile: user.profile
        ? {
            bio: user.profile.bio,
            photos: user.profile.photos,
            interests: user.profile.interests,
            occupation: user.profile.occupation,
            education: user.profile.education,
            height: user.profile.height,
          }
        : null,
      scoreBreakdown: scoreBreakdown.breakdown,
      verifications: verifications.map((v) => ({
        id: v.id,
        type: v.verificationType,
        status: v.verificationStatus,
        selfieImageUrl: v.selfieImageUrl,
        videoUrl: v.videoUrl,
        challengeCode: v.challengeCode,
        adminNotes: v.adminNotes,
        failureReason: v.failureReason,
        createdAt: v.createdAt,
        verifiedAt: v.verifiedAt,
      })),
      reportsReceived: reportsReceived.map((r) => ({
        id: r.id,
        reason: r.reason,
        description: r.description,
        reporterName: r.reporter?.name,
        isReviewed: r.isReviewed,
        actionTaken: r.actionTaken,
        createdAt: r.createdAt,
      })),
      reportsFiled: reportsFiled.map((r) => ({
        id: r.id,
        reason: r.reason,
        description: r.description,
        reportedName: r.reported?.name,
        isReviewed: r.isReviewed,
        createdAt: r.createdAt,
      })),
      scoreHistory: scoreHistory.map((s) => ({
        id: s.id,
        previousScore: Number(s.previousScore),
        newScore: Number(s.newScore),
        changeAmount: Number(s.changeAmount),
        reason: s.reason,
        category: s.category,
        createdAt: s.createdAt,
      })),
    };
  }

  async updateAppUser(userId: string, dto: UpdateAppUserDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updates: Partial<User> = {};

    if (dto.isBanned !== undefined) {
      updates.isBanned = dto.isBanned;
      updates.isActive = !dto.isBanned;
    }

    if (dto.isSuspended !== undefined) {
      updates.isSuspended = dto.isSuspended;
      updates.suspendedAt = dto.isSuspended ? new Date() : undefined;
    }

    if (dto.isVerified !== undefined) {
      updates.isVerified = dto.isVerified;
    }

    await this.userRepository.update(userId, updates);

    return {
      success: true,
      message: 'User updated successfully',
      updates,
    };
  }

  async adjustScore(userId: string, dto: AdjustScoreDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const previousScore = Number(user.safetyScore);
    const newScore = Math.max(0, Math.min(100, previousScore + dto.amount));

    await this.userRepository.update(userId, { safetyScore: newScore });

    // Log the change
    const log = this.scoreLogRepository.create({
      userId,
      previousScore,
      newScore,
      changeAmount: Number((newScore - previousScore).toFixed(2)),
      reason: dto.reason,
      category: ScoreChangeCategory.ADMIN_ACTION,
    });
    await this.scoreLogRepository.save(log);

    return {
      success: true,
      previousScore,
      newScore,
      changeAmount: newScore - previousScore,
      reason: dto.reason,
    };
  }

  // ==================== VERIFICATION MANAGEMENT ====================

  async listVerifications(query: {
    page?: number;
    limit?: number;
    status?: VerificationStatus;
    type?: VerificationType;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status) where.verificationStatus = query.status;
    if (query.type) where.verificationType = query.type;

    const [verifications, total] = await this.verificationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
      relations: ['user', 'user.profile'],
    });

    return {
      verifications: verifications.map((v) => ({
        id: v.id,
        userId: v.userId,
        userName: v.user?.name,
        userEmail: v.user?.email,
        userPhone: v.user?.phone,
        userPhoto: v.user?.profile?.photos?.[0] || null,
        verificationType: v.verificationType,
        verificationStatus: v.verificationStatus,
        selfieImageUrl: v.selfieImageUrl,
        videoUrl: v.videoUrl,
        challengeCode: v.challengeCode,
        phraseShown: v.phraseShown,
        adminNotes: v.adminNotes,
        createdAt: v.createdAt,
        verifiedAt: v.verifiedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getVerificationDetail(verificationId: string) {
    const verification = await this.verificationRepository.findOne({
      where: { id: verificationId },
      relations: ['user', 'user.profile'],
    });

    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    return {
      id: verification.id,
      userId: verification.userId,
      userName: verification.user?.name,
      userEmail: verification.user?.email,
      userPhone: verification.user?.phone,
      userPhotos: verification.user?.profile?.photos || [],
      verificationType: verification.verificationType,
      verificationStatus: verification.verificationStatus,
      selfieImageUrl: verification.selfieImageUrl,
      videoUrl: verification.videoUrl,
      challengeCode: verification.challengeCode,
      phraseShown: verification.phraseShown,
      phraseDetected: verification.phraseDetected,
      speechMatchScore: verification.speechMatchScore
        ? Number(verification.speechMatchScore)
        : null,
      faceMatchScore: verification.faceMatchScore
        ? Number(verification.faceMatchScore)
        : null,
      livenessScore: verification.livenessScore
        ? Number(verification.livenessScore)
        : null,
      adminNotes: verification.adminNotes,
      failureReason: verification.failureReason,
      createdAt: verification.createdAt,
      verifiedAt: verification.verifiedAt,
    };
  }

  async reviewVerification(
    verificationId: string,
    status: VerificationStatus,
    notes?: string,
  ) {
    return this.safetyService.reviewVerification({
      verificationId,
      status,
      notes,
    });
  }

  // ==================== REPORT MANAGEMENT ====================

  async listReports(query: {
    page?: number;
    limit?: number;
    isReviewed?: string;
    reason?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reporter', 'reporter')
      .leftJoinAndSelect('report.reported', 'reported');

    // Exclude blocks from report listing
    qb.andWhere('(report.description IS NULL OR report.description != :blocked)', {
      blocked: 'BLOCKED',
    });

    if (query.isReviewed === 'true') {
      qb.andWhere('report.isReviewed = true');
    } else if (query.isReviewed === 'false') {
      qb.andWhere('report.isReviewed = false');
    }

    if (query.reason) {
      qb.andWhere('report.reason = :reason', { reason: query.reason });
    }

    qb.orderBy('report.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [reports, total] = await qb.getManyAndCount();

    return {
      reports: reports.map((r) => ({
        id: r.id,
        reporterName: r.reporter?.name,
        reporterEmail: r.reporter?.email,
        reportedName: r.reported?.name,
        reportedEmail: r.reported?.email,
        reportedId: r.reportedId,
        reporterId: r.reporterId,
        reason: r.reason,
        description: r.description,
        isReviewed: r.isReviewed,
        reviewedAt: r.reviewedAt,
        reviewedBy: r.reviewedBy,
        actionTaken: r.actionTaken,
        createdAt: r.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getReportDetail(reportId: string) {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: ['reporter', 'reporter.profile', 'reported', 'reported.profile'],
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return {
      id: report.id,
      reason: report.reason,
      description: report.description,
      isReviewed: report.isReviewed,
      reviewedAt: report.reviewedAt,
      reviewedBy: report.reviewedBy,
      actionTaken: report.actionTaken,
      createdAt: report.createdAt,
      reporter: {
        id: report.reporter?.id,
        name: report.reporter?.name,
        email: report.reporter?.email,
        safetyScore: Number(report.reporter?.safetyScore || 0),
        createdAt: report.reporter?.createdAt,
        photo: report.reporter?.profile?.photos?.[0] || null,
      },
      reported: {
        id: report.reported?.id,
        name: report.reported?.name,
        email: report.reported?.email,
        safetyScore: Number(report.reported?.safetyScore || 0),
        isVerified: report.reported?.isVerified,
        isSuspended: report.reported?.isSuspended,
        isBanned: report.reported?.isBanned,
        createdAt: report.reported?.createdAt,
        photo: report.reported?.profile?.photos?.[0] || null,
      },
    };
  }

  async reviewReport(reportId: string, adminId: string, dto: ReviewReportDto) {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.isReviewed) {
      throw new BadRequestException('Report has already been reviewed');
    }

    report.isReviewed = true;
    report.reviewedAt = new Date();
    report.reviewedBy = adminId;
    report.actionTaken = dto.actionTaken;

    await this.reportRepository.save(report);

    return {
      success: true,
      reportId: report.id,
      actionTaken: dto.actionTaken,
    };
  }

  // ==================== ADMIN TEAM MANAGEMENT ====================

  async listAdminTeam() {
    const admins = await this.adminRepository.find({
      order: { createdAt: 'ASC' },
    });

    return admins.map((a) => ({
      id: a.id,
      email: a.email,
      name: a.name,
      role: a.role,
      isActive: a.isActive,
      lastLoginAt: a.lastLoginAt,
      createdAt: a.createdAt,
    }));
  }

  async createAdmin(dto: CreateAdminDto) {
    const existing = await this.adminRepository.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new BadRequestException('An admin with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const admin = this.adminRepository.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      name: dto.name,
      role: dto.role,
      isActive: true,
    });

    await this.adminRepository.save(admin);

    return {
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  async updateAdmin(adminId: string, dto: UpdateAdminDto) {
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (dto.name !== undefined) admin.name = dto.name;
    if (dto.role !== undefined) admin.role = dto.role;
    if (dto.isActive !== undefined) admin.isActive = dto.isActive;

    await this.adminRepository.save(admin);

    return {
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isActive: admin.isActive,
      },
    };
  }

  async deactivateAdmin(adminId: string, currentAdminId: string) {
    if (adminId === currentAdminId) {
      throw new ForbiddenException('You cannot deactivate yourself');
    }

    const admin = await this.adminRepository.findOne({ where: { id: adminId } });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    admin.isActive = false;
    await this.adminRepository.save(admin);

    return {
      success: true,
      message: `Admin ${admin.name} has been deactivated`,
    };
  }
}
