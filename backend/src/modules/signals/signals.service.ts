import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../database/entities/user.entity';
import { Signal } from '../../database/entities/signal.entity';
import { Match } from '../../database/entities/match.entity';
import { SignalType } from '../../database/entities/enums';
import {
    SendSignalDto,
    GetSignalsQueryDto,
    SignalResponseDto,
    SentSignalResponseDto,
    SignalSummaryDto,
} from './dto';

@Injectable()
export class SignalsService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Signal)
        private signalRepository: Repository<Signal>,
        @InjectRepository(Match)
        private matchRepository: Repository<Match>,
    ) { }

    // ==================== SEND SIGNAL ====================

    async sendSignal(senderId: string, dto: SendSignalDto) {
        const { targetUserId, signalType } = dto;

        if (senderId === targetUserId) {
            throw new BadRequestException('Cannot send signal to yourself');
        }

        // Check target user exists
        const targetUser = await this.userRepository.findOne({
            where: { id: targetUserId },
        });

        if (!targetUser) {
            throw new NotFoundException('User not found');
        }

        // Check if already sent the same signal today (rate limiting)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingSignal = await this.signalRepository
            .createQueryBuilder('signal')
            .where('signal.senderId = :senderId', { senderId })
            .andWhere('signal.receiverId = :receiverId', { receiverId: targetUserId })
            .andWhere('signal.signalType = :signalType', { signalType })
            .andWhere('signal.createdAt >= :today', { today })
            .getOne();

        if (existingSignal) {
            throw new BadRequestException(
                `You have already sent a ${signalType} to this user today`,
            );
        }

        // Create signal
        const signal = this.signalRepository.create({
            senderId,
            receiverId: targetUserId,
            signalType,
        });

        await this.signalRepository.save(signal);

        // Check for mutual interest (both sent wave or interested)
        let isMutual = false;
        if (signalType === SignalType.WAVE || signalType === SignalType.INTERESTED) {
            const reciprocalSignal = await this.signalRepository.findOne({
                where: {
                    senderId: targetUserId,
                    receiverId: senderId,
                    signalType: signalType,
                },
            });
            isMutual = !!reciprocalSignal;
        }

        const messages: Record<SignalType, string> = {
            [SignalType.WAVE]: isMutual
                ? 'You both waved! Start a conversation!'
                : 'Wave sent! They will be notified.',
            [SignalType.INTERESTED]: isMutual
                ? 'Mutual interest! Consider swiping right to match.'
                : 'Interest shown! They will know you are interested.',
            [SignalType.VIEWED]: 'Profile view recorded.',
        };

        return {
            success: true,
            signalId: signal.id,
            message: messages[signalType],
            isMutual,
        };
    }

    // ==================== GET RECEIVED SIGNALS ====================

    async getReceivedSignals(
        userId: string,
        query: GetSignalsQueryDto,
    ): Promise<SignalResponseDto[]> {
        const { type, limit = 20, offset = 0 } = query;

        let queryBuilder = this.signalRepository
            .createQueryBuilder('signal')
            .leftJoinAndSelect('signal.sender', 'sender')
            .leftJoinAndSelect('sender.profile', 'profile')
            .where('signal.receiverId = :userId', { userId })
            .orderBy('signal.createdAt', 'DESC')
            .skip(offset)
            .take(limit);

        if (type) {
            queryBuilder = queryBuilder.andWhere('signal.signalType = :type', { type });
        }

        const signals = await queryBuilder.getMany();

        // Mark as seen
        const signalIds = signals.filter((s) => !s.isSeen).map((s) => s.id);
        if (signalIds.length > 0) {
            await this.signalRepository
                .createQueryBuilder()
                .update(Signal)
                .set({ isSeen: true })
                .whereInIds(signalIds)
                .execute();
        }

        return signals.map((signal) => ({
            id: signal.id,
            signalType: signal.signalType,
            fromUser: {
                id: signal.sender.id,
                name: signal.sender.name,
                photos: signal.sender.profile?.photos,
                isVerified: signal.sender.isVerified,
            },
            createdAt: signal.createdAt,
            isNew: !signal.isSeen,
        }));
    }

    // ==================== GET SENT SIGNALS ====================

    async getSentSignals(
        userId: string,
        query: GetSignalsQueryDto,
    ): Promise<SentSignalResponseDto[]> {
        const { type, limit = 20, offset = 0 } = query;

        let queryBuilder = this.signalRepository
            .createQueryBuilder('signal')
            .leftJoinAndSelect('signal.receiver', 'receiver')
            .leftJoinAndSelect('receiver.profile', 'profile')
            .where('signal.senderId = :userId', { userId })
            .orderBy('signal.createdAt', 'DESC')
            .skip(offset)
            .take(limit);

        if (type) {
            queryBuilder = queryBuilder.andWhere('signal.signalType = :type', { type });
        }

        const signals = await queryBuilder.getMany();

        return signals.map((signal) => ({
            id: signal.id,
            signalType: signal.signalType,
            toUser: {
                id: signal.receiver.id,
                name: signal.receiver.name,
                photos: signal.receiver.profile?.photos,
            },
            createdAt: signal.createdAt,
        }));
    }

    // ==================== GET SIGNAL SUMMARY ====================

    async getSignalSummary(userId: string): Promise<SignalSummaryDto> {
        // Total and new counts
        const totalReceived = await this.signalRepository.count({
            where: { receiverId: userId },
        });

        const newCount = await this.signalRepository.count({
            where: { receiverId: userId, isSeen: false },
        });

        // Count by type
        const waveCount = await this.signalRepository.count({
            where: { receiverId: userId, signalType: SignalType.WAVE },
        });

        const interestedCount = await this.signalRepository.count({
            where: { receiverId: userId, signalType: SignalType.INTERESTED },
        });

        const viewedCount = await this.signalRepository.count({
            where: { receiverId: userId, signalType: SignalType.VIEWED },
        });

        return {
            totalReceived,
            newCount,
            byType: {
                wave: waveCount,
                interested: interestedCount,
                viewed: viewedCount,
            },
        };
    }

    // ==================== CHECK MUTUAL INTEREST ====================

    async checkMutualInterest(userId: string, targetUserId: string): Promise<boolean> {
        // Check if both have sent wave or interested to each other
        const sentSignal = await this.signalRepository.findOne({
            where: [
                { senderId: userId, receiverId: targetUserId, signalType: SignalType.WAVE },
                { senderId: userId, receiverId: targetUserId, signalType: SignalType.INTERESTED },
            ],
        });

        if (!sentSignal) return false;

        const receivedSignal = await this.signalRepository.findOne({
            where: [
                { senderId: targetUserId, receiverId: userId, signalType: SignalType.WAVE },
                { senderId: targetUserId, receiverId: userId, signalType: SignalType.INTERESTED },
            ],
        });

        return !!receivedSignal;
    }

    // ==================== GET WHO VIEWED ME ====================

    async getWhoViewedMe(userId: string, limit: number = 10) {
        const views = await this.signalRepository.find({
            where: {
                receiverId: userId,
                signalType: SignalType.VIEWED,
            },
            relations: ['sender', 'sender.profile'],
            order: { createdAt: 'DESC' },
            take: limit,
        });

        return views.map((view) => ({
            id: view.sender.id,
            name: view.sender.name,
            photos: view.sender.profile?.photos,
            isVerified: view.sender.isVerified,
            viewedAt: view.createdAt,
        }));
    }

    // ==================== MARK PROFILE VIEWED ====================

    async markProfileViewed(viewerId: string, profileId: string) {
        if (viewerId === profileId) return; // Don't track self-views

        // Check if already viewed today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingView = await this.signalRepository
            .createQueryBuilder('signal')
            .where('signal.senderId = :viewerId', { viewerId })
            .andWhere('signal.receiverId = :profileId', { profileId })
            .andWhere('signal.signalType = :type', { type: SignalType.VIEWED })
            .andWhere('signal.createdAt >= :today', { today })
            .getOne();

        if (!existingView) {
            const view = this.signalRepository.create({
                senderId: viewerId,
                receiverId: profileId,
                signalType: SignalType.VIEWED,
            });
            await this.signalRepository.save(view);
        }
    }
}
