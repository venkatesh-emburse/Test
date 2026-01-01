import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../database/entities/user.entity';
import { Profile } from '../../database/entities/profile.entity';
import { Gender } from '../../database/entities/enums';
import {
    UpdateProfileDto,
    UpdatePhotosDto,
    AddPhotoDto,
    UpdateLocationDto,
    UpdatePrivacyDto,
} from './dto';

@Injectable()
export class ProfileService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Profile)
        private profileRepository: Repository<Profile>,
    ) { }

    // ==================== GET PROFILE ====================

    async getProfile(userId: string) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['profile'],
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return this.mapToFullProfile(user);
    }

    async getPublicProfile(userId: string, viewerId: string) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['profile'],
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Update last viewed
        await this.userRepository.update(viewerId, {
            lastActiveAt: new Date(),
        });

        return this.mapToPublicProfile(user);
    }

    // ==================== UPDATE PROFILE ====================

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['profile'],
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Update user fields
        if (dto.name !== undefined) {
            user.name = dto.name;
        }

        // Ensure profile exists
        if (!user.profile) {
            user.profile = this.profileRepository.create({ userId });
        }

        // Update profile fields
        if (dto.bio !== undefined) user.profile.bio = dto.bio;
        if (dto.lookingFor !== undefined) user.profile.lookingFor = dto.lookingFor;
        if (dto.height !== undefined) user.profile.height = dto.height;
        if (dto.occupation !== undefined) user.profile.occupation = dto.occupation;
        if (dto.education !== undefined) user.profile.education = dto.education;
        if (dto.interests !== undefined) user.profile.interests = dto.interests;

        // Recalculate completeness
        user.profile.profileCompleteness = this.calculateCompleteness(user);

        await this.userRepository.save(user);
        await this.profileRepository.save(user.profile);

        return {
            success: true,
            profile: this.mapToFullProfile(user),
        };
    }

    // ==================== PHOTOS ====================

    async updatePhotos(userId: string, dto: UpdatePhotosDto) {
        const profile = await this.getOrCreateProfile(userId);

        if (dto.photos.length > 6) {
            throw new BadRequestException('Maximum 6 photos allowed');
        }

        profile.photos = dto.photos;
        profile.profileCompleteness = await this.recalculateCompleteness(userId);
        await this.profileRepository.save(profile);

        return {
            success: true,
            photos: profile.photos,
            completeness: profile.profileCompleteness,
        };
    }

    async addPhoto(userId: string, dto: AddPhotoDto) {
        const profile = await this.getOrCreateProfile(userId);

        const currentPhotos = profile.photos || [];
        if (currentPhotos.length >= 6) {
            throw new BadRequestException('Maximum 6 photos allowed');
        }

        profile.photos = [...currentPhotos, dto.photoUrl];
        profile.profileCompleteness = await this.recalculateCompleteness(userId);
        await this.profileRepository.save(profile);

        return {
            success: true,
            photos: profile.photos,
            completeness: profile.profileCompleteness,
        };
    }

    async deletePhoto(userId: string, index: number) {
        const profile = await this.getOrCreateProfile(userId);

        const currentPhotos = profile.photos || [];
        if (index < 0 || index >= currentPhotos.length) {
            throw new BadRequestException('Invalid photo index');
        }

        profile.photos = currentPhotos.filter((_, i) => i !== index);
        profile.profileCompleteness = await this.recalculateCompleteness(userId);
        await this.profileRepository.save(profile);

        return {
            success: true,
            photos: profile.photos,
            completeness: profile.profileCompleteness,
        };
    }

    async reorderPhotos(userId: string, order: number[]) {
        const profile = await this.getOrCreateProfile(userId);

        const currentPhotos = profile.photos || [];
        if (order.length !== currentPhotos.length) {
            throw new BadRequestException('Order array must match photos count');
        }

        // Validate indices
        const sortedOrder = [...order].sort((a, b) => a - b);
        for (let i = 0; i < sortedOrder.length; i++) {
            if (sortedOrder[i] !== i) {
                throw new BadRequestException('Invalid order indices');
            }
        }

        profile.photos = order.map((i) => currentPhotos[i]);
        await this.profileRepository.save(profile);

        return {
            success: true,
            photos: profile.photos,
        };
    }

    // ==================== LOCATION ====================

    async updateLocation(userId: string, dto: UpdateLocationDto) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Create PostGIS Point
        await this.userRepository
            .createQueryBuilder()
            .update(User)
            .set({
                location: () => `ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)`,
                locationUpdatedAt: new Date(),
            })
            .where('id = :id', { id: userId })
            .execute();

        return {
            success: true,
            locationUpdatedAt: new Date(),
        };
    }

    // ==================== PRIVACY ====================

    async updatePrivacy(userId: string, dto: UpdatePrivacyDto) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Women are off map by default (safety feature)
        if (dto.showOnMap !== undefined) {
            user.showOnMap = dto.showOnMap;
        }

        if (dto.isInvisible !== undefined) {
            user.isInvisible = dto.isInvisible;
        }

        await this.userRepository.save(user);

        return {
            success: true,
            showOnMap: user.showOnMap,
            isInvisible: user.isInvisible,
        };
    }

    // ==================== INTERESTS ====================

    async getInterestSuggestions(): Promise<string[]> {
        // Popular interest tags
        return [
            'Travel', 'Music', 'Coffee', 'Hiking', 'Photography',
            'Cooking', 'Reading', 'Movies', 'Fitness', 'Gaming',
            'Art', 'Dancing', 'Yoga', 'Sports', 'Food',
            'Tech', 'Fashion', 'Nature', 'Pets', 'Wine',
            'Beach', 'Mountains', 'City Life', 'Netflix', 'Concerts',
        ];
    }

    // ==================== HELPER METHODS ====================

    private async getOrCreateProfile(userId: string): Promise<Profile> {
        let profile = await this.profileRepository.findOne({
            where: { userId },
        });

        if (!profile) {
            profile = this.profileRepository.create({ userId });
            await this.profileRepository.save(profile);
        }

        return profile;
    }

    private async recalculateCompleteness(userId: string): Promise<number> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['profile'],
        });
        return this.calculateCompleteness(user!);
    }

    private calculateCompleteness(user: User): number {
        let score = 0;
        const weights = {
            name: 15,
            bio: 20,
            photos: 25,
            interests: 15,
            lookingFor: 10,
            height: 5,
            occupation: 5,
            education: 5,
        };

        if (user.name && user.name.length > 0) score += weights.name;
        if (user.profile?.bio && user.profile.bio.length > 10) score += weights.bio;
        if (user.profile?.photos && user.profile.photos.length >= 1) {
            score += Math.min(user.profile.photos.length * 5, weights.photos);
        }
        if (user.profile?.interests && user.profile.interests.length >= 3) score += weights.interests;
        if (user.profile?.lookingFor) score += weights.lookingFor;
        if (user.profile?.height) score += weights.height;
        if (user.profile?.occupation) score += weights.occupation;
        if (user.profile?.education) score += weights.education;

        return Math.min(score, 100);
    }

    private mapToFullProfile(user: User) {
        return {
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                gender: user.gender,
                dateOfBirth: user.dateOfBirth,
                intent: user.intent,
                safetyScore: Number(user.safetyScore),
                isVerified: user.isVerified,
                currentPlan: user.currentPlan,
                lastActiveAt: user.lastActiveAt,
            },
            profile: {
                bio: user.profile?.bio,
                lookingFor: user.profile?.lookingFor,
                height: user.profile?.height,
                occupation: user.profile?.occupation,
                education: user.profile?.education,
                photos: user.profile?.photos,
                interests: user.profile?.interests,
                completeness: user.profile?.profileCompleteness || 0,
            },
            privacy: {
                showOnMap: user.showOnMap,
                isInvisible: user.isInvisible,
            },
        };
    }

    private mapToPublicProfile(user: User) {
        return {
            id: user.id,
            name: user.name,
            gender: user.gender,
            intent: user.intent,
            safetyScore: Number(user.safetyScore),
            isVerified: user.isVerified,
            bio: user.profile?.bio,
            lookingFor: user.profile?.lookingFor,
            photos: user.profile?.photos,
            interests: user.profile?.interests,
        };
    }
}
