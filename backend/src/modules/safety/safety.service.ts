import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Not, In } from 'typeorm';
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
  Gender,
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
        accountAge: breakdown.accountAge,
        behavioralScore: breakdown.behavioralScore,
        activityBonus: breakdown.activityBonus,
      },
      googleConnected: breakdown.googleConnected,
      canIncreaseWithGoogle: !breakdown.googleConnected,
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
    // 1. Selfie Verification (0-30 points)
    const verification = await this.verificationRepository.findOne({
      where: {
        userId: user.id,
        verificationStatus: VerificationStatus.VERIFIED,
      },
        order: { createdAt: 'DESC' },
    });
    const severePenaltyCount = await this.reportRepository.count({
      where: {
        reportedId: user.id,
        isReviewed: true,
        actionTaken: Not(''),
        reason: In([
          ReportReason.FAKE_PROFILE,
          ReportReason.SCAM,
          ReportReason.IMPERSONATION,
        ]),
      },
    });
    const selfieVerification = Math.max(0, (verification ? 30 : 0) - severePenaltyCount * 5);

    // 2. Profile Quality (0-20 points)
    const profileQuality = this.calculateProfileQuality(user.profile);

    // 3. Account Age (0-10 points)
    const storedAccountAge = Number(user.accountAgeScore || 0);
    const accountAge = Math.max(
      0,
      Math.min(10, storedAccountAge > 0 ? storedAccountAge : this.calculateAccountAgeScore(user.createdAt)),
    );

    // 4. Hidden Google trust checks (0-20 points)
    const googleNameMatch = this.calculateNameConsistency(user).score;
    const googleGenderMatch = this.calculateGoogleGenderMatch(user);
    const googleConnected = !!user.googleAccountLinkedAt;

    // 5. Behavioral Score (0-15 points)
    const behavioralScore = await this.calculateBehavioralScore(user);

    // 6. Activity Bonus (0-5 points)
    const activityBonus = this.calculateActivityBonus(user);

    const total =
      selfieVerification +
      profileQuality +
      accountAge +
      googleNameMatch +
      googleGenderMatch +
      behavioralScore +
      activityBonus;

    return {
      selfieVerification,
      profileQuality,
      accountAge,
      behavioralScore,
      activityBonus,
      googleConnected,
      total: Math.max(0, Math.min(100, total)),
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async refreshAccountAgeScoresDaily() {
    const users = await this.userRepository.find();

    for (const user of users) {
      const nextScore = this.calculateAccountAgeScore(user.createdAt);
      if (Math.abs(Number(user.accountAgeScore) - nextScore) < 0.01) {
        continue;
      }

      await this.userRepository.update(user.id, { accountAgeScore: nextScore });
      await this.updateUserSafetyScore(
        user.id,
        'Daily account age score refresh',
        ScoreChangeCategory.ACTIVITY,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async recoverBehaviorScoresDaily() {
    const users = await this.userRepository.find();
    const now = new Date();

    for (const user of users) {
      const currentScore = Number(user.behavioralScoreValue || 15);
      if (currentScore >= 15) {
        continue;
      }

      const cleanSince = user.lastMisbehaviorAt
        ? Math.floor((now.getTime() - new Date(user.lastMisbehaviorAt).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      const lastRecoveryDay = user.lastBehaviorRecoveryAt?.toDateString();

      if (cleanSince < 14 || lastRecoveryDay == now.toDateString()) {
        continue;
      }

      user.behavioralScoreValue = Math.min(15, currentScore + 3);
      user.lastBehaviorRecoveryAt = now;
      await this.userRepository.save(user);

      await this.updateUserSafetyScore(
        user.id,
        'Recovered behavioral score after 14 clean days',
        ScoreChangeCategory.BEHAVIORAL,
      );
    }
  }

  // ==================== BEHAVIORAL SCORE ====================

  private async calculateBehavioralScore(user: User): Promise<number> {
    return Math.max(0, Math.min(15, Number(user.behavioralScoreValue || 15)));
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
    const photosScore = Math.min(12, photosCount * 3);

    const bioLength = (profile.bio || '').trim().length;
    let bioScore = 0;
    if (bioLength >= 160) bioScore = 4;
    else if (bioLength >= 100) bioScore = 3;
    else if (bioLength >= 50) bioScore = 2;

    const interestsScore = Math.min(2, profile.interests?.length || 0);
    const occupationScore = (profile.occupation || '').trim().length > 0 ? 1 : 0;
    const educationScore = (profile.education || '').trim().length > 0 ? 1 : 0;

    return Math.min(20, photosScore + bioScore + interestsScore + occupationScore + educationScore);
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

    const isIdentityReport = [
      ReportReason.FAKE_PROFILE,
      ReportReason.IMPERSONATION,
    ].includes(reason);
    const isSevereReport = reason === ReportReason.UNDERAGE;
    const isBehavioralReport = [
      ReportReason.HARASSMENT,
      ReportReason.SPAM,
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
      // Identity reports are penalized after admin review.
    } else if (isBehavioralReport) {
      // Behavioral penalties are applied after admin review.
    }

    return {
      success: true,
      reportId: report.id,
      message:
        'Report submitted successfully. We will review it within 24-48 hours.',
    };
  }

  async applyReviewedReportPenalty(reportId: string, actionTaken?: string) {
    const normalizedAction = (actionTaken || '').trim().toLowerCase();
    if (!normalizedAction || ['dismissed', 'no_action', 'rejected', 'ignored'].includes(normalizedAction)) {
      return;
    }

    const report = await this.reportRepository.findOne({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const user = await this.userRepository.findOne({ where: { id: report.reportedId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const commonReasons = [
      ReportReason.HARASSMENT,
      ReportReason.SPAM,
      ReportReason.INAPPROPRIATE_CONTENT,
      ReportReason.OTHER,
    ];
    const severeReasons = [
      ReportReason.FAKE_PROFILE,
      ReportReason.SCAM,
      ReportReason.IMPERSONATION,
    ];

    let shouldRecalculate = false;

    if (commonReasons.includes(report.reason)) {
      user.behavioralScoreValue = Math.max(0, Number(user.behavioralScoreValue || 15) - 5);
      user.lastMisbehaviorAt = new Date();
      user.lastBehaviorRecoveryAt = undefined;
      shouldRecalculate = true;
    }

    if (severeReasons.includes(report.reason)) {
      user.lastMisbehaviorAt = new Date();
      user.lastBehaviorRecoveryAt = undefined;
      shouldRecalculate = true;
    }

    if (!shouldRecalculate) {
      return;
    }

    await this.userRepository.save(user);
    await this.updateUserSafetyScore(
      user.id,
      `Reviewed report penalty applied: ${report.reason}`,
      ScoreChangeCategory.REPORT_PENALTY,
    );
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

  private calculateGoogleGenderMatch(user: User): number {
    if (!user.googleAccountLinkedAt || !user.googleGender) {
      return 0;
    }

    if (user.gender === Gender.OTHER || user.googleGender === Gender.OTHER) {
      return 0;
    }

    return user.gender === user.googleGender ? 15 : 0;
  }

  private calculateAccountAgeScore(createdAt?: Date): number {
    if (!createdAt) {
      return 0;
    }

    const accountAgeDays = Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );

    return Math.min(10, Math.floor(accountAgeDays / 14));
  }

  private calculateNameConsistency(user: User) {
    const maxScore = 5;
    const appName = this.normalizeName(user.name);
    const googleName = this.normalizeName(user.googleDisplayName);

    if (!googleName) {
      return {
        score: 0,
        maxScore,
        appName: user.name?.trim() || undefined,
        googleName: undefined,
        status: 'unavailable' as const,
        reason: 'Available after Google sign-in stores a signup name.',
        matchedWords: [],
      };
    }

    if (!appName) {
      return {
        score: 0,
        maxScore,
        appName: undefined,
        googleName: user.googleDisplayName?.trim(),
        status: 'mismatch' as const,
        reason: 'Add your in-app name so we can compare it with Google signup.',
        matchedWords: [],
      };
    }

    const appTokens = this.tokenizeName(appName);
    const googleTokens = this.tokenizeName(googleName);
    const matchedWords = this.findMatchingNameTokens(appTokens, googleTokens);
    const exactSetMatch =
      appTokens.length > 0 &&
      appTokens.length === googleTokens.length &&
      matchedWords.length === appTokens.length;
    const overlapRatio =
      Math.max(appTokens.length, googleTokens.length) > 0
        ? matchedWords.length / Math.max(appTokens.length, googleTokens.length)
        : 0;
    const hasStrongBoundaryMatch = this.hasStrongBoundaryMatch(appTokens, googleTokens);

    if (appName === googleName || exactSetMatch) {
      return {
        score: maxScore,
        maxScore,
        appName: user.name?.trim(),
        googleName: user.googleDisplayName?.trim(),
        status: 'matched' as const,
        reason: 'Full name matches Google signup, even if the order is different.',
        matchedWords,
      };
    }

    if (overlapRatio >= 0.75 || (hasStrongBoundaryMatch && matchedWords.length >= 2)) {
      return {
        score: 4,
        maxScore,
        appName: user.name?.trim(),
        googleName: user.googleDisplayName?.trim(),
        status: 'partial' as const,
        reason: 'Most important name parts match across your app and Google signup.',
        matchedWords,
      };
    }

    if (overlapRatio >= 0.4 || matchedWords.length >= 1) {
      return {
        score: 2,
        maxScore,
        appName: user.name?.trim(),
        googleName: user.googleDisplayName?.trim(),
        status: 'partial' as const,
        reason: 'Some name parts match, but not enough for a strong consistency check.',
        matchedWords,
      };
    }

    return {
      score: 0,
      maxScore,
      appName: user.name?.trim(),
      googleName: user.googleDisplayName?.trim(),
      status: 'mismatch' as const,
      reason: 'Your in-app name does not match the Google signup name closely enough.',
      matchedWords: [],
    };
  }

  private normalizeName(name?: string): string {
    return (name || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenizeName(name: string): string[] {
    return Array.from(new Set(name.split(' ').filter((token) => token.length >= 2))).slice(0, 5);
  }

  private findMatchingNameTokens(appTokens: string[], googleTokens: string[]): string[] {
    const matchedWords = new Set<string>();
    const usedGoogleIndexes = new Set<number>();

    for (const appToken of appTokens) {
      const googleIndex = googleTokens.findIndex((googleToken, index) => {
        if (usedGoogleIndexes.has(index)) return false;
        return this.areNameTokensCompatible(appToken, googleToken);
      });

      if (googleIndex >= 0) {
        usedGoogleIndexes.add(googleIndex);
        matchedWords.add(appToken);
      }
    }

    return Array.from(matchedWords);
  }

  private hasStrongBoundaryMatch(appTokens: string[], googleTokens: string[]): boolean {
    if (appTokens.length < 2 || googleTokens.length < 2) {
      return false;
    }

    const appFirst = appTokens[0];
    const appLast = appTokens[appTokens.length - 1];
    const googleFirst = googleTokens[0];
    const googleLast = googleTokens[googleTokens.length - 1];

    return (
      (this.areNameTokensCompatible(appFirst, googleFirst) &&
        this.areNameTokensCompatible(appLast, googleLast)) ||
      (this.areNameTokensCompatible(appFirst, googleLast) &&
        this.areNameTokensCompatible(appLast, googleFirst))
    );
  }

  private areNameTokensCompatible(left: string, right: string): boolean {
    if (left === right) {
      return true;
    }

    const minLength = Math.min(left.length, right.length);
    if (minLength >= 4 && (left.startsWith(right) || right.startsWith(left))) {
      return true;
    }

    return minLength >= 4 && (left.includes(right) || right.includes(left));
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(' ');
    const words2 = str2.split(' ');
    const set1 = new Set(words1);
    const matchingWords = words2.filter((w) => set1.has(w)).length;
    return matchingWords / Math.max(words1.length, words2.length);
  }
}
