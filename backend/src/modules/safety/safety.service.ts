import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Not } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { User } from '../../database/entities/user.entity';
import { Profile } from '../../database/entities/profile.entity';
import { SafetyVerification } from '../../database/entities/safety-verification.entity';
import { SafetyScoreLog } from '../../database/entities/safety-score-log.entity';
import { Report } from '../../database/entities/report.entity';
import { Match } from '../../database/entities/match.entity';
import { Message } from '../../database/entities/message.entity';
import {
  VerificationStatus,
  VerificationType,
  ReportReason,
  ScoreChangeCategory,
} from '../../database/entities/enums';
import {
  StartVerificationDto,
  SubmitVerificationDto,
  StartSelfieVerificationDto,
  SubmitSelfieVerificationDto,
  ReviewVerificationDto,
  SubmitReportDto,
} from './dto';

@Injectable()
export class SafetyService {
  // Store active verification sessions (in production, use Redis)
  private verificationSessions: Map<
    string,
    {
      userId: string;
      phrase: string;
      expiresAt: Date;
    }
  > = new Map();

  private selfieSessions: Map<
    string,
    {
      userId: string;
      challengeCode: string;
      expiresAt: Date;
    }
  > = new Map();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(SafetyVerification)
    private verificationRepository: Repository<SafetyVerification>,
    @InjectRepository(SafetyScoreLog)
    private scoreLogRepository: Repository<SafetyScoreLog>,
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  // ==================== VIDEO VERIFICATION ====================

  async startVerification(userId: string, dto: StartVerificationDto) {
    const pending = await this.verificationRepository.findOne({
      where: {
        userId,
        verificationStatus: VerificationStatus.PENDING,
      },
    });

    if (pending) {
      throw new BadRequestException(
        'You already have a pending verification. Please wait for it to be reviewed.',
      );
    }

    const sessionId = uuidv4();
    const phrase = this.generateChallengeCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    this.verificationSessions.set(sessionId, {
      userId,
      phrase,
      expiresAt,
    });

    return {
      sessionId,
      phrase,
      expiresAt,
      instructions:
        'Please record a short video showing the number displayed on screen. ' +
        'Make sure your face is visible and well-lit. The video should be 5-10 seconds.',
    };
  }

  async submitVerification(userId: string, dto: SubmitVerificationDto) {
    const { sessionId, videoUrl, phraseShown, phraseDetected } = dto;

    const session = this.verificationSessions.get(sessionId);
    if (!session) {
      throw new BadRequestException('Invalid or expired verification session');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Session does not belong to you');
    }

    if (new Date() > session.expiresAt) {
      this.verificationSessions.delete(sessionId);
      throw new BadRequestException(
        'Verification session has expired. Please start again.',
      );
    }

    if (session.phrase !== phraseShown) {
      throw new BadRequestException('Phrase mismatch. Please try again.');
    }

    this.verificationSessions.delete(sessionId);

    const speechMatchScore = phraseDetected
      ? this.calculateSimilarity(
          phraseShown.toLowerCase(),
          phraseDetected.toLowerCase(),
        ) * 100
      : 50;
    const faceMatchScore = 80;
    const livenessScore = 85;

    const isAutoApproved =
      speechMatchScore >= 70 && faceMatchScore >= 70 && livenessScore >= 70;

    const verification = new SafetyVerification();
    verification.userId = userId;
    verification.videoUrl = videoUrl;
    verification.phraseShown = phraseShown;
    verification.phraseDetected = phraseDetected || undefined;
    verification.speechMatchScore = speechMatchScore;
    verification.faceMatchScore = faceMatchScore;
    verification.livenessScore = livenessScore;
    verification.verificationStatus = isAutoApproved
      ? VerificationStatus.VERIFIED
      : VerificationStatus.PENDING;
    verification.verificationType = VerificationType.VIDEO;
    verification.verifiedAt = isAutoApproved ? new Date() : undefined;

    await this.verificationRepository.save(verification);

    if (isAutoApproved) {
      await this.userRepository.update(userId, { isVerified: true });
      await this.updateUserSafetyScore(userId, 'Video verification approved', ScoreChangeCategory.VERIFICATION);
    }

    return {
      success: true,
      status: verification.verificationStatus,
      message: isAutoApproved
        ? 'Verification successful! Your profile is now verified.'
        : 'Verification submitted for review. We will notify you once reviewed.',
      verificationId: verification.id,
    };
  }

  async getVerificationStatus(userId: string) {
    const verification = await this.verificationRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!verification) {
      return {
        hasVerification: false,
        canResubmit: true,
        safetyScore: Number(user?.safetyScore || 0),
      };
    }

    const canResubmit =
      verification.verificationStatus === VerificationStatus.FAILED;

    return {
      hasVerification: true,
      status: verification.verificationStatus,
      verificationType: verification.verificationType,
      verifiedAt: verification.verifiedAt,
      safetyScore: Number(user?.safetyScore || 0),
      canResubmit,
    };
  }

  // ==================== SELFIE VERIFICATION ====================

  async startSelfieVerification(
    userId: string,
    _dto: StartSelfieVerificationDto,
  ) {
    const pending = await this.verificationRepository.findOne({
      where: {
        userId,
        verificationStatus: VerificationStatus.PENDING,
        verificationType: VerificationType.SELFIE,
      },
    });

    if (pending) {
      throw new BadRequestException(
        'You already have a pending selfie verification. Please wait for it to be reviewed.',
      );
    }

    const sessionId = uuidv4();
    const challengeCode = this.generateChallengeCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    this.selfieSessions.set(sessionId, {
      userId,
      challengeCode,
      expiresAt,
    });

    return {
      sessionId,
      challengeCode,
      expiresAt,
      instructions:
        'Write the code on paper, hold it clearly next to your face, and take a well-lit selfie.',
    };
  }

  async submitSelfieVerification(
    userId: string,
    dto: SubmitSelfieVerificationDto,
  ) {
    const { sessionId, selfieUrl, challengeCodeShown } = dto;

    const session = this.selfieSessions.get(sessionId);
    if (!session) {
      throw new BadRequestException('Invalid or expired verification session');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Session does not belong to you');
    }

    if (new Date() > session.expiresAt) {
      this.selfieSessions.delete(sessionId);
      throw new BadRequestException(
        'Verification session has expired. Please start again.',
      );
    }

    if (session.challengeCode !== challengeCodeShown) {
      throw new BadRequestException(
        'Challenge code mismatch. Please try again.',
      );
    }

    this.selfieSessions.delete(sessionId);

    const verification = new SafetyVerification();
    verification.userId = userId;
    verification.selfieImageUrl = selfieUrl;
    verification.challengeCode = challengeCodeShown;
    verification.verificationStatus = VerificationStatus.PENDING;
    verification.verificationType = VerificationType.SELFIE;

    await this.verificationRepository.save(verification);

    return {
      success: true,
      status: verification.verificationStatus,
      message: 'Selfie submitted for review. We will notify you once reviewed.',
      verificationId: verification.id,
    };
  }

  // ==================== SAFETY SCORE ====================

  async getSafetyScoreBreakdown(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const breakdown = await this.calculateSafetyScoreBreakdown(user);
    const newScore = Math.max(0, Math.min(100, breakdown.total));

    // Sync stored safetyScore with the live calculation
    const previousScore = Number(user.safetyScore);
    if (Math.abs(newScore - previousScore) >= 0.01) {
      await this.userRepository.update(userId, { safetyScore: newScore });
    }

    return {
      totalScore: newScore,
      breakdown: {
        selfieVerification: breakdown.selfieVerification,
        profileQuality: breakdown.profileQuality,
        identityVerification: breakdown.identityVerification,
        accountAge: breakdown.accountAge,
        behavioralScore: breakdown.behavioralScore,
        activityBonus: breakdown.activityBonus,
        reportPenalty: breakdown.reportPenalty,
      },
      isVerified: user.isVerified,
      lastUpdated: new Date(),
    };
  }

  async getScoreHistory(userId: string, limit = 20, offset = 0) {
    const [logs, total] = await this.scoreLogRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      history: logs.map((log) => ({
        id: log.id,
        previousScore: Number(log.previousScore),
        newScore: Number(log.newScore),
        changeAmount: Number(log.changeAmount),
        reason: log.reason,
        category: log.category,
        createdAt: log.createdAt,
      })),
      total,
      hasMore: offset + limit < total,
    };
  }

  async updateUserSafetyScore(
    userId: string,
    reason?: string,
    category?: ScoreChangeCategory,
  ): Promise<number> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const previousScore = Number(user.safetyScore);
    const breakdown = await this.calculateSafetyScoreBreakdown(user);
    const newScore = Math.max(0, Math.min(100, breakdown.total));

    await this.userRepository.update(userId, { safetyScore: newScore });

    // Log the score change if there was an actual change
    if (Math.abs(newScore - previousScore) >= 0.01) {
      await this.logScoreChange(
        userId,
        previousScore,
        newScore,
        reason || 'Score recalculated',
        category || ScoreChangeCategory.ADMIN_ACTION,
      );
    }

    return newScore;
  }

  private async logScoreChange(
    userId: string,
    previousScore: number,
    newScore: number,
    reason: string,
    category: ScoreChangeCategory,
  ) {
    const log = this.scoreLogRepository.create({
      userId,
      previousScore,
      newScore,
      changeAmount: Number((newScore - previousScore).toFixed(2)),
      reason,
      category,
    });
    await this.scoreLogRepository.save(log);
  }

  private async calculateSafetyScoreBreakdown(user: User) {
    // 1. Selfie/Video Verification (0-30 points) — was 35
    const verification = await this.verificationRepository.findOne({
      where: {
        userId: user.id,
        verificationStatus: VerificationStatus.VERIFIED,
      },
      order: { createdAt: 'DESC' },
    });
    const selfieVerification = verification ? 30 : 0;

    // 2. Profile Quality (0-25 points) — was 30, now more granular
    const profileQuality = this.calculateProfileQuality(user.profile);

    // 3. Identity Verification (0-15 points)
    const identityVerification = this.calculateIdentityVerification(user);

    // 4. Account Age (0-10 points)
    const accountAgeDays = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    const accountAge = Math.min(10, Math.round(accountAgeDays / 14));

    // 5. Behavioral Score (0-15 points) — NEW
    const behavioralScore = await this.calculateBehavioralScore(user);

    // 6. Activity Bonus (0-5 points) — NEW
    const activityBonus = this.calculateActivityBonus(user);

    // 7. Report Penalty (-30 to 0 points)
    const reportsCount = await this.reportRepository.count({
      where: {
        reportedId: user.id,
        isReviewed: true,
        actionTaken: Not(''),
      },
    });
    const swipeWarningPenalty = Math.min(15, (user.swipeWarningCount || 0) * 5);
    const reportPenalty = Math.max(-30, -reportsCount * 10 - swipeWarningPenalty);

    const total =
      selfieVerification +
      profileQuality +
      identityVerification +
      accountAge +
      behavioralScore +
      activityBonus +
      reportPenalty;

    return {
      selfieVerification,
      profileQuality,
      identityVerification,
      accountAge,
      behavioralScore,
      activityBonus,
      reportPenalty,
      total: Math.max(0, Math.min(100, total)),
    };
  }

  // ==================== BEHAVIORAL SCORE ====================

  private async calculateBehavioralScore(user: User): Promise<number> {
    const totalMatches = await this.matchRepository.count({
      where: [
        { user1Id: user.id },
        { user2Id: user.id },
      ],
    });

    // New users with <5 matches get a default of 8/15
    if (totalMatches < 5) return 8;

    let score = 0;

    // A. Response Rate (0-6 pts)
    const matchesWithMessages = await this.matchRepository
      .createQueryBuilder('match')
      .where('(match.user1Id = :userId OR match.user2Id = :userId)', { userId: user.id })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from(Message, 'msg')
          .where('msg.matchId = match.id')
          .andWhere('msg.senderId = :senderId', { senderId: user.id })
          .getQuery();
        return `EXISTS ${subQuery}`;
      })
      .getCount();

    const responseRate = totalMatches > 0 ? matchesWithMessages / totalMatches : 0;
    if (responseRate >= 0.8) score += 6;
    else if (responseRate >= 0.6) score += 4;
    else if (responseRate >= 0.4) score += 2;

    // B. Micro-date Completion Rate (0-4 pts)
    const completedMicroDates = await this.matchRepository.count({
      where: [
        { user1Id: user.id, microDateCompleted: true },
        { user2Id: user.id, microDateCompleted: true },
      ],
    });

    const microDateRate = totalMatches > 0 ? completedMicroDates / totalMatches : 0;
    if (microDateRate >= 0.7) score += 4;
    else if (microDateRate >= 0.5) score += 3;
    else if (microDateRate >= 0.3) score += 1;

    // C. Low Unmatch-by-Others (0-3 pts)
    const unmatchedByOthers = await this.matchRepository
      .createQueryBuilder('match')
      .where('(match.user1Id = :userId OR match.user2Id = :userId)', { userId: user.id })
      .andWhere('match.isActive = :isActive', { isActive: false })
      .andWhere('match.unmatchedBy IS NOT NULL')
      .andWhere('match.unmatchedBy != :userId', { userId: user.id })
      .getCount();

    const unmatchRate = totalMatches > 0 ? unmatchedByOthers / totalMatches : 0;
    if (unmatchRate < 0.1) score += 3;
    else if (unmatchRate < 0.25) score += 2;
    else if (unmatchRate < 0.5) score += 1;

    // D. Report-Free Bonus (0-2 pts)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const recentReports = await this.reportRepository.count({
      where: {
        reportedId: user.id,
        createdAt: MoreThan(ninetyDaysAgo),
      },
    });

    if (recentReports === 0) score += 2;

    return Math.min(15, score);
  }

  // ==================== ACTIVITY BONUS ====================

  private calculateActivityBonus(user: User): number {
    if (!user.lastActiveAt) return 0;

    const daysSinceActive = Math.floor(
      (Date.now() - new Date(user.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceActive <= 7) return 5;
    if (daysSinceActive <= 14) return 3;
    if (daysSinceActive <= 30) return 1;
    return 0;
  }

  // ==================== PROFILE QUALITY ====================

  private calculateProfileQuality(profile?: Profile): number {
    if (!profile) return 0;

    const photosCount = profile.photos?.length || 0;
    const photosScore = Math.min(15, photosCount * 3);

    const bioLength = (profile.bio || '').trim().length;
    let bioScore = 0;
    if (bioLength >= 160) bioScore = 5;
    else if (bioLength >= 100) bioScore = 4;
    else if (bioLength >= 50) bioScore = 2;

    const interestsScore = Math.min(3, profile.interests?.length || 0);
    const occupationScore = (profile.occupation || '').trim().length > 0 ? 1 : 0;
    const educationScore = (profile.education || '').trim().length > 0 ? 1 : 0;

    return Math.min(25, photosScore + bioScore + interestsScore + occupationScore + educationScore);
  }

  // ==================== ADMIN REVIEW ====================

  async getVerificationsForAdmin(
    status?: VerificationStatus,
    type?: VerificationType,
    limit = 50,
  ) {
    const where: Partial<SafetyVerification> = {};

    if (status) where.verificationStatus = status;
    if (type) where.verificationType = type;

    const verifications = await this.verificationRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: Math.min(100, Math.max(1, limit)),
      relations: ['user'],
    });

    return verifications.map((v) => ({
      id: v.id,
      userId: v.userId,
      userName: v.user?.name,
      userEmail: v.user?.email,
      userPhone: v.user?.phone,
      verificationType: v.verificationType,
      verificationStatus: v.verificationStatus,
      selfieImageUrl: v.selfieImageUrl,
      videoUrl: v.videoUrl,
      challengeCode: v.challengeCode,
      phraseShown: v.phraseShown,
      createdAt: v.createdAt,
    }));
  }

  async reviewVerification(dto: ReviewVerificationDto) {
    const verification = await this.verificationRepository.findOne({
      where: { id: dto.verificationId },
    });

    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    verification.verificationStatus = dto.status;
    verification.adminNotes = dto.notes;

    if (dto.status === VerificationStatus.VERIFIED) {
      verification.verifiedAt = new Date();
      verification.failureReason = undefined;
      await this.verificationRepository.save(verification);

      await this.userRepository.update(verification.userId, {
        isVerified: true,
      });
      await this.updateUserSafetyScore(
        verification.userId,
        'Verification approved by admin',
        ScoreChangeCategory.VERIFICATION,
      );
    } else if (dto.status === VerificationStatus.FAILED) {
      verification.failureReason = dto.notes || 'Failed verification';
      verification.verifiedAt = undefined;
      await this.verificationRepository.save(verification);
    } else {
      await this.verificationRepository.save(verification);
    }

    return {
      success: true,
      verificationId: verification.id,
      status: verification.verificationStatus,
    };
  }

  // ==================== SMART REPORTING ====================

  async reportUser(reporterId: string, dto: SubmitReportDto) {
    const { reportedUserId, reason, description } = dto;

    if (reporterId === reportedUserId) {
      throw new BadRequestException('You cannot report yourself');
    }

    const reportedUser = await this.userRepository.findOne({
      where: { id: reportedUserId },
    });

    if (!reportedUser) {
      throw new NotFoundException('User not found');
    }

    const existingReport = await this.reportRepository.findOne({
      where: {
        reporterId,
        reportedId: reportedUserId,
        isReviewed: false,
      },
    });

    if (existingReport) {
      throw new BadRequestException(
        'You have already reported this user. Please wait for review.',
      );
    }

    const report = this.reportRepository.create({
      reporterId,
      reportedId: reportedUserId,
      reason,
      description,
    });

    await this.reportRepository.save(report);

    // ========== SMART CATEGORY HANDLING ==========

    const isIdentityReport = reason === ReportReason.FAKE_PROFILE;
    const isSevereReport = reason === ReportReason.UNDERAGE;
    const isBehavioralReport = [
      ReportReason.HARASSMENT,
      ReportReason.SPAM,
      ReportReason.SCAM,
      ReportReason.INAPPROPRIATE_CONTENT,
    ].includes(reason);

    if (isSevereReport) {
      // Immediate auto-suspension
      await this.userRepository.update(reportedUserId, {
        isSuspended: true,
        suspendedAt: new Date(),
      });
      await this.updateUserSafetyScore(
        reportedUserId,
        'Auto-suspended: Underage report received',
        ScoreChangeCategory.REPORT_PENALTY,
      );
    } else if (isIdentityReport) {
      // Trigger mandatory re-verification
      await this.userRepository.update(reportedUserId, {
        isVerified: false,
      });

      const latestVerification = await this.verificationRepository.findOne({
        where: { userId: reportedUserId, verificationStatus: VerificationStatus.VERIFIED },
        order: { createdAt: 'DESC' },
      });
      if (latestVerification) {
        latestVerification.verificationStatus = VerificationStatus.PENDING;
        latestVerification.adminNotes = `Re-review triggered by fake profile report from user ${reporterId}`;
        await this.verificationRepository.save(latestVerification);
      }

      await this.updateUserSafetyScore(
        reportedUserId,
        'Verification revoked: Fake profile report received',
        ScoreChangeCategory.REPORT_PENALTY,
      );
    } else if (isBehavioralReport) {
      // Check for auto-suspension threshold: 3+ unique reporters in 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const uniqueReporters = await this.reportRepository
        .createQueryBuilder('report')
        .select('COUNT(DISTINCT report.reporterId)', 'count')
        .where('report.reportedId = :reportedUserId', { reportedUserId })
        .andWhere('report.createdAt > :thirtyDaysAgo', { thirtyDaysAgo })
        .andWhere('report.description != :blocked', { blocked: 'BLOCKED' })
        .getRawOne();

      const uniqueCount = parseInt(uniqueReporters?.count || '0', 10);

      if (uniqueCount >= 3) {
        await this.userRepository.update(reportedUserId, {
          isSuspended: true,
          suspendedAt: new Date(),
        });
        await this.updateUserSafetyScore(
          reportedUserId,
          `Auto-suspended: ${uniqueCount} unique reporters in 30 days`,
          ScoreChangeCategory.REPORT_PENALTY,
        );
      }
    }

    return {
      success: true,
      reportId: report.id,
      message:
        'Report submitted successfully. We will review it within 24-48 hours.',
    };
  }

  async getMyReports(userId: string) {
    const reports = await this.reportRepository.find({
      where: { reporterId: userId },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      description: r.description,
      createdAt: r.createdAt,
      isReviewed: r.isReviewed,
      actionTaken: r.actionTaken,
    }));
  }

  // ==================== BLOCKING ====================

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException('You cannot block yourself');
    }

    const existingBlock = await this.reportRepository.findOne({
      where: {
        reporterId: blockerId,
        reportedId: blockedId,
        reason: ReportReason.OTHER,
        description: 'BLOCKED',
      },
    });

    if (existingBlock) {
      throw new BadRequestException('User is already blocked');
    }

    const block = this.reportRepository.create({
      reporterId: blockerId,
      reportedId: blockedId,
      reason: ReportReason.OTHER,
      description: 'BLOCKED',
      isReviewed: true,
      actionTaken: 'blocked',
    });

    await this.reportRepository.save(block);

    return { success: true, message: 'User blocked successfully' };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    const block = await this.reportRepository.findOne({
      where: {
        reporterId: blockerId,
        reportedId: blockedId,
        description: 'BLOCKED',
      },
    });

    if (!block) {
      throw new NotFoundException('Block not found');
    }

    await this.reportRepository.remove(block);

    return { success: true, message: 'User unblocked successfully' };
  }

  async getBlockedUsers(userId: string) {
    const blocks = await this.reportRepository.find({
      where: {
        reporterId: userId,
        description: 'BLOCKED',
      },
    });

    return blocks.map((b) => ({
      userId: b.reportedId,
      blockedAt: b.createdAt,
    }));
  }

  // ==================== HELPER METHODS ====================

  private generateChallengeCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private calculateIdentityVerification(user: User): number {
    let score = 0;
    if (user.phoneVerified) score += 10;
    if (user.emailVerified) score += 5;
    return Math.min(15, score);
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(' ');
    const words2 = str2.split(' ');
    const set1 = new Set(words1);
    const matchingWords = words2.filter((w) => set1.has(w)).length;
    return matchingWords / Math.max(words1.length, words2.length);
  }
}
