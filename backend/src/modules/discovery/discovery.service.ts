import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { User } from '../../database/entities/user.entity';
import { Profile } from '../../database/entities/profile.entity';
import { Swipe } from '../../database/entities/swipe.entity';
import { Match } from '../../database/entities/match.entity';
import { SwipeAction, SubscriptionPlan } from '../../database/entities/enums';
import { DiscoveryQueryDto, SwipeDto, DiscoveryProfileDto, MatchDto } from './dto';

@Injectable()
export class DiscoveryService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Profile)
        private profileRepository: Repository<Profile>,
        @InjectRepository(Swipe)
        private swipeRepository: Repository<Swipe>,
        @InjectRepository(Match)
        private matchRepository: Repository<Match>,
        private configService: ConfigService,
    ) { }

    // ==================== DISCOVERY ====================

    async getDiscoveryProfiles(
        userId: string,
        query: DiscoveryQueryDto,
    ): Promise<{ profiles: DiscoveryProfileDto[]; total: number }> {
        const currentUser = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['profile'],
        });

        if (!currentUser) {
            throw new NotFoundException('User not found');
        }

        // Check daily swipe limit for free users
        await this.checkAndResetDailyCounters(currentUser);

        // Get IDs to exclude (already swiped, blocked, matched)
        const excludeIds = await this.getExcludedUserIds(userId);
        excludeIds.push(userId); // Exclude self

        console.log(`🔍 Discovery for user ${userId}: Excluding ${excludeIds.length} users`);

        // Get limit based on plan features
        const maxRadius = query.maxDistance || 100; // MVP: All users get full radius

        const limit = query.limit || 10;
        const offset = query.offset || 0;

        // Build query for potential matches
        const queryBuilder = this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.profile', 'profile')
            .where('user.id != :currentUserId', { currentUserId: userId }) // Explicitly exclude self
            .andWhere(excludeIds.length > 1 ? 'user.id NOT IN (:...excludeIds)' : '1=1', { excludeIds })
            .andWhere('user.isActive = :isActive', { isActive: true })
            .andWhere('user.isBanned = :isBanned', { isBanned: false })
            .andWhere('user.isInvisible = :isInvisible', { isInvisible: false })
            // Same intent matching (no cross-intent)
            .andWhere('user.intent = :intent', { intent: currentUser.intent });

        // Age filter
        if (query.minAge) {
            const maxBirthDate = new Date();
            maxBirthDate.setFullYear(maxBirthDate.getFullYear() - query.minAge);
            queryBuilder.andWhere('user.dateOfBirth <= :maxBirthDate', { maxBirthDate });
        }

        if (query.maxAge) {
            const minBirthDate = new Date();
            minBirthDate.setFullYear(minBirthDate.getFullYear() - query.maxAge - 1);
            queryBuilder.andWhere('user.dateOfBirth >= :minBirthDate', { minBirthDate });
        }

        // Order by compatibility (safety score + profile completeness first, not distance)
        queryBuilder
            .orderBy('user.safetyScore', 'DESC')
            .addOrderBy('profile.profileCompleteness', 'DESC')
            .skip(offset)
            .take(limit);

        const [users, total] = await queryBuilder.getManyAndCount();

        // Transform to DTO
        const profiles = users.map((user) =>
            this.mapToDiscoveryProfile(user, currentUser),
        );

        return { profiles, total };
    }

    // ==================== SWIPE ====================

    async swipe(userId: string, dto: SwipeDto): Promise<{
        success: boolean;
        action: SwipeAction;
        isMatch: boolean;
        match?: any;
    }> {
        const { targetUserId, action } = dto;

        // Validate target user exists
        const targetUser = await this.userRepository.findOne({
            where: { id: targetUserId },
            relations: ['profile'],
        });

        if (!targetUser) {
            throw new NotFoundException('Target user not found');
        }

        // Get current user
        const currentUser = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!currentUser) {
            throw new NotFoundException('User not found');
        }

        // Check if already swiped
        const existingSwipe = await this.swipeRepository.findOne({
            where: { swiperId: userId, swipedId: targetUserId },
        });

        if (existingSwipe) {
            throw new BadRequestException('You have already swiped on this user');
        }

        // Check daily limits
        await this.checkAndResetDailyCounters(currentUser);

        // MVP: Check daily limits (applies to all users)
        const swipesLimit = this.configService.get<number>('features.swipesPerDay') || 50;
        const superLikesLimit = this.configService.get<number>('features.superLikesPerDay') || 5;

        if (currentUser.swipesToday >= swipesLimit) {
            throw new ForbiddenException(
                `Daily swipe limit (${swipesLimit}) reached. Come back tomorrow!`
            );
        }

        // Check super like daily limit
        if (action === SwipeAction.SUPER_LIKE && currentUser.superLikesToday >= superLikesLimit) {
            throw new ForbiddenException(
                `Daily super like limit (${superLikesLimit}) reached. Come back tomorrow!`
            );
        }

        // Create swipe
        const swipe = this.swipeRepository.create({
            swiperId: userId,
            swipedId: targetUserId,
            action,
        });
        await this.swipeRepository.save(swipe);

        // Update daily counter
        currentUser.swipesToday += 1;
        if (action === SwipeAction.SUPER_LIKE) {
            currentUser.superLikesToday += 1;
        }
        await this.userRepository.save(currentUser);

        // Check for mutual like (match)
        let isMatch = false;
        let match = null;

        if (action === SwipeAction.LIKE || action === SwipeAction.SUPER_LIKE) {
            const mutualSwipe = await this.swipeRepository.findOne({
                where: {
                    swiperId: targetUserId,
                    swipedId: userId,
                    action: In([SwipeAction.LIKE, SwipeAction.SUPER_LIKE]),
                },
            });

            if (mutualSwipe) {
                isMatch = true;
                match = await this.createMatch(userId, targetUserId);
            }
        }

        return {
            success: true,
            action,
            isMatch,
            match: match ? {
                id: match.id,
                matchedAt: match.matchedAt,
                user: {
                    id: targetUser.id,
                    name: targetUser.name,
                    photos: targetUser.profile?.photos,
                },
            } : undefined,
        };
    }

    // ==================== MATCHES ====================

    async getMatches(userId: string): Promise<MatchDto[]> {
        const matches = await this.matchRepository
            .createQueryBuilder('match')
            .leftJoinAndSelect('match.user1', 'user1')
            .leftJoinAndSelect('user1.profile', 'profile1')
            .leftJoinAndSelect('match.user2', 'user2')
            .leftJoinAndSelect('user2.profile', 'profile2')
            .where('(match.user1Id = :userId OR match.user2Id = :userId)', { userId })
            .andWhere('match.isActive = :isActive', { isActive: true })
            .orderBy('match.matchedAt', 'DESC')
            .getMany();

        return matches.map((match) => {
            const otherUser = match.user1Id === userId ? match.user2 : match.user1;
            return {
                id: match.id,
                matchedAt: match.matchedAt,
                microDateCompleted: match.microDateCompleted,
                chatUnlocked: match.chatUnlocked,
                otherUser: {
                    id: otherUser.id,
                    name: otherUser.name,
                    photos: otherUser.profile?.photos,
                    safetyScore: Number(otherUser.safetyScore),
                    isVerified: otherUser.isVerified,
                },
            };
        });
    }

    async getMatch(userId: string, matchId: string) {
        const match = await this.matchRepository.findOne({
            where: { id: matchId },
            relations: ['user1', 'user1.profile', 'user2', 'user2.profile'],
        });

        if (!match) {
            throw new NotFoundException('Match not found');
        }

        if (match.user1Id !== userId && match.user2Id !== userId) {
            throw new ForbiddenException('Not authorized to view this match');
        }

        const otherUser = match.user1Id === userId ? match.user2 : match.user1;

        return {
            id: match.id,
            matchedAt: match.matchedAt,
            microDateGame: match.microDateGame,
            microDateCompleted: match.microDateCompleted,
            chatUnlocked: match.chatUnlocked,
            otherUser: {
                id: otherUser.id,
                name: otherUser.name,
                gender: otherUser.gender,
                intent: otherUser.intent,
                bio: otherUser.profile?.bio,
                photos: otherUser.profile?.photos,
                interests: otherUser.profile?.interests,
                safetyScore: Number(otherUser.safetyScore),
                isVerified: otherUser.isVerified,
            },
        };
    }

    async unmatch(userId: string, matchId: string) {
        const match = await this.matchRepository.findOne({
            where: { id: matchId },
        });

        if (!match) {
            throw new NotFoundException('Match not found');
        }

        if (match.user1Id !== userId && match.user2Id !== userId) {
            throw new ForbiddenException('Not authorized to unmatch');
        }

        match.isActive = false;
        match.unmatchedAt = new Date();
        match.unmatchedBy = userId;
        await this.matchRepository.save(match);

        return { success: true, message: 'Unmatched successfully' };
    }

    // ==================== HELPER METHODS ====================

    private async getExcludedUserIds(userId: string): Promise<string[]> {
        // Get users already swiped
        const swipes = await this.swipeRepository.find({
            where: { swiperId: userId },
            select: ['swipedId'],
        });

        const swipedIds = swipes.map((s) => s.swipedId);

        // Get matched users (active matches)
        const matches = await this.matchRepository.find({
            where: [
                { user1Id: userId, isActive: true },
                { user2Id: userId, isActive: true },
            ],
        });

        const matchedIds = matches.map((m) =>
            m.user1Id === userId ? m.user2Id : m.user1Id,
        );

        return [...new Set([...swipedIds, ...matchedIds])];
    }

    private async createMatch(user1Id: string, user2Id: string): Promise<Match> {
        // Ensure consistent ordering (lower ID first)
        const [firstId, secondId] = [user1Id, user2Id].sort();

        // Check if match already exists
        const existingMatch = await this.matchRepository.findOne({
            where: { user1Id: firstId, user2Id: secondId },
        });

        if (existingMatch) {
            existingMatch.isActive = true;
            existingMatch.matchedAt = new Date();
            return this.matchRepository.save(existingMatch);
        }

        // Create new match with random micro-date game
        const microDateGames = [
            'two_truths_lie',
            'would_you_rather',
            'perfect_sunday',
            'travel_dreams',
            'food_wars',
        ];
        const randomGame = microDateGames[Math.floor(Math.random() * microDateGames.length)];

        const match = this.matchRepository.create({
            user1Id: firstId,
            user2Id: secondId,
            matchedAt: new Date(),
            microDateGame: randomGame,
            microDateCompleted: false,
            chatUnlocked: false,
            isActive: true,
        });

        return this.matchRepository.save(match);
    }

    private async checkAndResetDailyCounters(user: User): Promise<void> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!user.countersResetAt || new Date(user.countersResetAt) < today) {
            user.swipesToday = 0;
            user.superLikesToday = 0;
            user.countersResetAt = today;
            await this.userRepository.save(user);
        }
    }

    private mapToDiscoveryProfile(user: User, currentUser: User): DiscoveryProfileDto {
        const age = this.calculateAge(user.dateOfBirth);
        const compatibilityScore = this.calculateCompatibility(user, currentUser);

        return {
            id: user.id,
            name: user.name,
            age,
            gender: user.gender,
            intent: user.intent,
            bio: user.profile?.bio,
            lookingFor: user.profile?.lookingFor,
            interests: user.profile?.interests,
            photos: user.profile?.photos,
            safetyScore: Number(user.safetyScore),
            isVerified: user.isVerified,
            compatibilityScore,
        };
    }

    private calculateAge(dateOfBirth: Date): number {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    private calculateCompatibility(user: User, currentUser: User): number {
        let score = 0;

        // Same intent: +30 points
        if (user.intent === currentUser.intent) {
            score += 30;
        }

        // Safety score contribution: up to +30 points
        score += Math.min(Number(user.safetyScore) * 0.3, 30);

        // Profile completeness: up to +20 points
        const completeness = user.profile?.profileCompleteness || 0;
        score += Math.min(completeness * 0.2, 20);

        // Interest overlap: up to +20 points
        if (user.profile?.interests && currentUser.profile?.interests) {
            const userInterests = new Set(user.profile.interests);
            const commonInterests = currentUser.profile.interests.filter((i) =>
                userInterests.has(i),
            );
            const interestScore = Math.min(commonInterests.length * 5, 20);
            score += interestScore;
        }

        return Math.round(Math.min(score, 100));
    }
}
