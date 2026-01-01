import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { User } from '../../database/entities/user.entity';
import { Profile } from '../../database/entities/profile.entity';
import { SafetyVerification } from '../../database/entities/safety-verification.entity';
import { Report } from '../../database/entities/report.entity';
import { VerificationStatus, ReportReason } from '../../database/entities/enums';
import {
    StartVerificationDto,
    SubmitVerificationDto,
    SubmitReportDto,
    VERIFICATION_PHRASES,
} from './dto';

@Injectable()
export class SafetyService {
    // Store active verification sessions (in production, use Redis)
    private verificationSessions: Map<string, {
        userId: string;
        phrase: string;
        expiresAt: Date;
    }> = new Map();

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Profile)
        private profileRepository: Repository<Profile>,
        @InjectRepository(SafetyVerification)
        private verificationRepository: Repository<SafetyVerification>,
        @InjectRepository(Report)
        private reportRepository: Repository<Report>,
    ) { }

    // ==================== VIDEO VERIFICATION ====================

    async startVerification(userId: string, dto: StartVerificationDto) {
        // Check if user already has a pending verification
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

        // Generate session
        const sessionId = uuidv4();
        const phrase = this.getRandomPhrase();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Store session
        this.verificationSessions.set(sessionId, {
            userId,
            phrase,
            expiresAt,
        });

        return {
            sessionId,
            phrase,
            expiresAt,
            instructions: 'Please record a short video of yourself clearly saying the phrase shown above. ' +
                'Make sure your face is visible and well-lit. The video should be 5-10 seconds.',
        };
    }

    async submitVerification(userId: string, dto: SubmitVerificationDto) {
        const { sessionId, videoUrl, phraseShown, phraseDetected } = dto;

        // Validate session
        const session = this.verificationSessions.get(sessionId);
        if (!session) {
            throw new BadRequestException('Invalid or expired verification session');
        }

        if (session.userId !== userId) {
            throw new ForbiddenException('Session does not belong to you');
        }

        if (new Date() > session.expiresAt) {
            this.verificationSessions.delete(sessionId);
            throw new BadRequestException('Verification session has expired. Please start again.');
        }

        if (session.phrase !== phraseShown) {
            throw new BadRequestException('Phrase mismatch. Please try again.');
        }

        // Clean up session
        this.verificationSessions.delete(sessionId);

        // Calculate scores (in production, these would come from AI)
        // For MVP, we simulate with basic checks
        const speechMatchScore = phraseDetected
            ? this.calculateSimilarity(phraseShown.toLowerCase(), phraseDetected.toLowerCase()) * 100
            : 50; // Default if not provided
        const faceMatchScore = 80; // Placeholder - would come from face detection AI
        const livenessScore = 85; // Placeholder - would come from liveness detection

        // Auto-approve if all scores are high
        const isAutoApproved = speechMatchScore >= 70 && faceMatchScore >= 70 && livenessScore >= 70;

        // Create verification record
        const verification = new SafetyVerification();
        verification.userId = userId;
        verification.videoUrl = videoUrl;
        verification.phraseShown = phraseShown;
        verification.phraseDetected = phraseDetected || undefined;
        verification.speechMatchScore = speechMatchScore;
        verification.faceMatchScore = faceMatchScore;
        verification.livenessScore = livenessScore;
        verification.verificationStatus = isAutoApproved ? VerificationStatus.VERIFIED : VerificationStatus.PENDING;
        verification.verifiedAt = isAutoApproved ? new Date() : undefined;

        await this.verificationRepository.save(verification);

        // Update user if auto-approved
        if (isAutoApproved) {
            await this.updateUserSafetyScore(userId);
            await this.userRepository.update(userId, { isVerified: true });
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

        const canResubmit = verification.verificationStatus === VerificationStatus.FAILED;

        return {
            hasVerification: true,
            status: verification.verificationStatus,
            verifiedAt: verification.verifiedAt,
            safetyScore: Number(user?.safetyScore || 0),
            canResubmit,
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

        return {
            totalScore: breakdown.total,
            breakdown: {
                videoVerification: breakdown.videoVerification,
                profileCompleteness: breakdown.profileCompleteness,
                accountAge: breakdown.accountAge,
                chatBehavior: breakdown.chatBehavior,
                reportPenalty: breakdown.reportPenalty,
            },
            isVerified: user.isVerified,
            lastUpdated: new Date(),
        };
    }

    async updateUserSafetyScore(userId: string): Promise<number> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['profile'],
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const breakdown = await this.calculateSafetyScoreBreakdown(user);
        const newScore = Math.max(0, Math.min(100, breakdown.total));

        await this.userRepository.update(userId, { safetyScore: newScore });

        return newScore;
    }

    private async calculateSafetyScoreBreakdown(user: User) {
        // 1. Video Verification (0-40 points)
        const verification = await this.verificationRepository.findOne({
            where: { userId: user.id, verificationStatus: VerificationStatus.VERIFIED },
            order: { createdAt: 'DESC' },
        });
        const videoVerification = verification ? 40 : 0;

        // 2. Profile Completeness (0-20 points)
        const completeness = user.profile?.profileCompleteness || 0;
        const profileCompleteness = Math.round(completeness * 0.2);

        // 3. Account Age (0-15 points)
        const accountAgeDays = Math.floor(
            (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24),
        );
        const accountAge = Math.min(15, Math.round(accountAgeDays / 7)); // 1 point per week, max 15

        // 4. Chat Behavior (0-15 points) - Placeholder for MVP
        const chatBehavior = 10; // Default good behavior

        // 5. Report Penalty (-30 to 0 points)
        const reportsCount = await this.reportRepository.count({
            where: {
                reportedId: user.id,
                isReviewed: true,
                actionTaken: MoreThan(''),
            },
        });
        const reportPenalty = Math.max(-30, -reportsCount * 10);

        const total = videoVerification + profileCompleteness + accountAge + chatBehavior + reportPenalty;

        return {
            videoVerification,
            profileCompleteness,
            accountAge,
            chatBehavior,
            reportPenalty,
            total: Math.max(0, Math.min(100, total)),
        };
    }

    // ==================== REPORTING ====================

    async reportUser(reporterId: string, dto: SubmitReportDto) {
        const { reportedUserId, reason, description } = dto;

        if (reporterId === reportedUserId) {
            throw new BadRequestException('You cannot report yourself');
        }

        // Check reported user exists
        const reportedUser = await this.userRepository.findOne({
            where: { id: reportedUserId },
        });

        if (!reportedUser) {
            throw new NotFoundException('User not found');
        }

        // Check for duplicate reports
        const existingReport = await this.reportRepository.findOne({
            where: {
                reporterId,
                reportedId: reportedUserId,
                isReviewed: false,
            },
        });

        if (existingReport) {
            throw new BadRequestException('You have already reported this user. Please wait for review.');
        }

        // Create report
        const report = this.reportRepository.create({
            reporterId,
            reportedId: reportedUserId,
            reason,
            description,
        });

        await this.reportRepository.save(report);

        return {
            success: true,
            reportId: report.id,
            message: 'Report submitted successfully. We will review it within 24-48 hours.',
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

        // In a full implementation, we'd have a BlockedUser entity
        // For MVP, we'll use the Report entity with a special reason
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

        return {
            success: true,
            message: 'User blocked successfully',
        };
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

        return {
            success: true,
            message: 'User unblocked successfully',
        };
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

    private getRandomPhrase(): string {
        const index = Math.floor(Math.random() * VERIFICATION_PHRASES.length);
        return VERIFICATION_PHRASES[index];
    }

    private calculateSimilarity(str1: string, str2: string): number {
        // Simple word-based similarity
        const words1 = str1.split(' ');
        const words2 = str2.split(' ');
        const set1 = new Set(words1);
        const matchingWords = words2.filter((w) => set1.has(w)).length;
        return matchingWords / Math.max(words1.length, words2.length);
    }
}
