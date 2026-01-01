import {
    Injectable,
    BadRequestException,
    UnauthorizedException,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { User } from '../../database/entities/user.entity';
import { Profile } from '../../database/entities/profile.entity';
import { OtpCode, OtpPurpose } from '../../database/entities/otp-code.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { UserIntent, Gender, SubscriptionPlan } from '../../database/entities/enums';
import {
    SendPhoneOtpDto,
    SendEmailOtpDto,
    VerifyPhoneOtpDto,
    VerifyEmailOtpDto,
    SetIntentDto,
    CreateProfileDto,
    RefreshTokenDto,
} from './dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Profile)
        private profileRepository: Repository<Profile>,
        @InjectRepository(OtpCode)
        private otpRepository: Repository<OtpCode>,
        @InjectRepository(RefreshToken)
        private refreshTokenRepository: Repository<RefreshToken>,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    // ==================== OTP METHODS ====================

    async sendPhoneOtp(dto: SendPhoneOtpDto): Promise<{ success: boolean; message: string; expiresIn: number }> {
        const { phone } = dto;

        // Check rate limiting (max 5 OTPs per hour)
        const recentOtps = await this.otpRepository.count({
            where: {
                identifier: phone,
                purpose: OtpPurpose.PHONE_VERIFICATION,
                createdAt: MoreThan(new Date(Date.now() - 60 * 60 * 1000)),
            },
        });

        if (recentOtps >= 5) {
            throw new BadRequestException('Too many OTP requests. Please try again later.');
        }

        // Generate 6-digit OTP
        const otpCode = this.generateOtp();
        const expiryMinutes = this.configService.get<number>('otp.expiryMinutes') ?? 10;
        const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

        // Hash the OTP before storing
        const hashedOtp = await bcrypt.hash(otpCode, 10);

        // Check if user exists
        const existingUser = await this.userRepository.findOne({ where: { phone } });

        // Determine if we're in dev mode
        const isDev = this.configService.get('nodeEnv') !== 'production';

        // Save OTP
        const otp = this.otpRepository.create({
            identifier: phone,
            code: hashedOtp,
            plainCode: isDev ? otpCode : undefined, // Store plain OTP only in dev mode
            purpose: OtpPurpose.PHONE_VERIFICATION,
            expiresAt,
            userId: existingUser?.id,
        });
        await this.otpRepository.save(otp);

        // Send OTP via SMS service only in production
        if (!isDev) {
            // TODO: Integrate SMS service (Twilio, MSG91, etc.)
            // await this.smsService.send(phone, `Your OTP is: ${otpCode}`);
            console.log(`📱 Would send OTP to ${phone} in production`);
        } else {
            console.log(`📱 [DEV MODE] OTP for ${phone}: ${otpCode}`);
        }

        return {
            success: true,
            message: isDev
                ? `OTP sent successfully. [DEV MODE: Check logs or use GET /auth/dev/otp/${phone}]`
                : 'OTP sent successfully',
            expiresIn: expiryMinutes * 60,
        };
    }

    async sendEmailOtp(dto: SendEmailOtpDto): Promise<{ success: boolean; message: string; expiresIn: number }> {
        const { email } = dto;

        // Check rate limiting
        const recentOtps = await this.otpRepository.count({
            where: {
                identifier: email,
                purpose: OtpPurpose.EMAIL_VERIFICATION,
                createdAt: MoreThan(new Date(Date.now() - 60 * 60 * 1000)),
            },
        });

        if (recentOtps >= 5) {
            throw new BadRequestException('Too many OTP requests. Please try again later.');
        }

        const otpCode = this.generateOtp();
        const expiryMinutes = this.configService.get<number>('otp.expiryMinutes') ?? 10;
        const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
        const hashedOtp = await bcrypt.hash(otpCode, 10);

        const existingUser = await this.userRepository.findOne({ where: { email } });

        // Determine if we're in dev mode
        const isDev = this.configService.get('nodeEnv') !== 'production';

        const otp = this.otpRepository.create({
            identifier: email,
            code: hashedOtp,
            plainCode: isDev ? otpCode : undefined, // Store plain OTP only in dev mode
            purpose: OtpPurpose.EMAIL_VERIFICATION,
            expiresAt,
            userId: existingUser?.id,
        });
        await this.otpRepository.save(otp);

        // Send OTP via email service only in production
        if (!isDev) {
            // TODO: Integrate email service
            // await this.emailService.send(email, 'Your OTP', `Your OTP is: ${otpCode}`);
            console.log(`📧 Would send OTP to ${email} in production`);
        } else {
            console.log(`📧 [DEV MODE] OTP for ${email}: ${otpCode}`);
        }

        return {
            success: true,
            message: isDev
                ? `OTP sent successfully. [DEV MODE: Check logs or use GET /auth/dev/otp/${email}]`
                : 'OTP sent successfully',
            expiresIn: expiryMinutes * 60,
        };
    }

    async verifyPhoneOtp(dto: VerifyPhoneOtpDto) {
        const { phone, code } = dto;
        return this.verifyOtpAndAuthenticate(phone, code, OtpPurpose.PHONE_VERIFICATION, 'phone');
    }

    async verifyEmailOtp(dto: VerifyEmailOtpDto) {
        const { email, code } = dto;
        return this.verifyOtpAndAuthenticate(email, code, OtpPurpose.EMAIL_VERIFICATION, 'email');
    }

    private async verifyOtpAndAuthenticate(
        identifier: string,
        code: string,
        purpose: OtpPurpose,
        type: 'phone' | 'email',
    ) {
        // Find the latest unused OTP
        const otp = await this.otpRepository.findOne({
            where: {
                identifier,
                purpose,
                isUsed: false,
                expiresAt: MoreThan(new Date()),
            },
            order: { createdAt: 'DESC' },
        });

        if (!otp) {
            throw new BadRequestException('Invalid or expired OTP');
        }

        // Check attempts
        if (otp.attempts >= 3) {
            throw new BadRequestException('Too many failed attempts. Please request a new OTP.');
        }

        // Verify OTP
        const isValid = await bcrypt.compare(code, otp.code);
        if (!isValid) {
            otp.attempts += 1;
            await this.otpRepository.save(otp);
            throw new BadRequestException('Invalid OTP');
        }

        // Mark OTP as used
        otp.isUsed = true;
        await this.otpRepository.save(otp);

        // Find or create user
        let user = await this.userRepository.findOne({
            where: type === 'phone' ? { phone: identifier } : { email: identifier },
            relations: ['profile'],
        });

        let isNewUser = false;
        if (!user) {
            isNewUser = true;
            user = this.userRepository.create({
                [type]: identifier,
                [`${type}Verified`]: true,
                name: '', // Will be set during onboarding
                dateOfBirth: new Date('1990-01-01'), // Placeholder
                gender: Gender.OTHER, // Placeholder
                intent: UserIntent.LONG_TERM, // Default
                currentPlan: SubscriptionPlan.FREE,
            });
            await this.userRepository.save(user);
        } else {
            // Update verification status
            user[`${type}Verified`] = true;
            await this.userRepository.save(user);
        }

        // Generate tokens
        const tokens = await this.generateTokens(user);

        return {
            ...tokens,
            isNewUser,
            profileComplete: this.isProfileComplete(user),
        };
    }

    // ==================== TOKEN METHODS ====================

    async generateTokens(user: User) {
        const payload = {
            sub: user.id,
            phone: user.phone,
            email: user.email,
        };

        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get('jwt.secret'),
            expiresIn: this.configService.get('jwt.expiresIn'),
        });

        const refreshTokenValue = uuidv4();
        const hashedRefreshToken = await bcrypt.hash(refreshTokenValue, 10);
        const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') ?? '30d';
        const refreshExpiresMs = this.parseExpiresIn(refreshExpiresIn);

        // Save refresh token
        const refreshToken = this.refreshTokenRepository.create({
            userId: user.id,
            token: hashedRefreshToken,
            expiresAt: new Date(Date.now() + refreshExpiresMs),
        });
        await this.refreshTokenRepository.save(refreshToken);

        return {
            accessToken,
            refreshToken: refreshTokenValue,
            tokenType: 'Bearer',
            expiresIn: this.parseExpiresIn(this.configService.get('jwt.expiresIn') ?? '7d') / 1000,
            user: this.mapUserToResponse(user),
        };
    }

    async refreshTokens(dto: RefreshTokenDto) {
        const { refreshToken } = dto;

        // Find all valid refresh tokens
        const validTokens = await this.refreshTokenRepository.find({
            where: {
                isRevoked: false,
                expiresAt: MoreThan(new Date()),
            },
            relations: ['user'],
        });

        // Find matching token
        let matchedToken: RefreshToken | null = null;
        for (const token of validTokens) {
            const isMatch = await bcrypt.compare(refreshToken, token.token);
            if (isMatch) {
                matchedToken = token;
                break;
            }
        }

        if (!matchedToken || !matchedToken.user) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        // Revoke old token
        matchedToken.isRevoked = true;
        matchedToken.revokedAt = new Date();
        await this.refreshTokenRepository.save(matchedToken);

        // Generate new tokens
        return this.generateTokens(matchedToken.user);
    }

    async logout(userId: string) {
        // Revoke all refresh tokens for this user
        await this.refreshTokenRepository.update(
            { userId, isRevoked: false },
            { isRevoked: true, revokedAt: new Date() },
        );

        return { success: true, message: 'Logged out successfully' };
    }

    // ==================== ONBOARDING METHODS ====================

    async setIntent(userId: string, dto: SetIntentDto) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new BadRequestException('User not found');
        }

        // Check if intent was changed in last 30 days
        if (user.intentChangedAt) {
            const daysSinceChange = (Date.now() - user.intentChangedAt.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceChange < 30) {
                throw new BadRequestException(
                    `Intent can only be changed once every 30 days. ${Math.ceil(30 - daysSinceChange)} days remaining.`,
                );
            }
        }

        user.intent = dto.intent;
        user.intentChangedAt = new Date();
        await this.userRepository.save(user);

        return {
            success: true,
            intent: user.intent,
            nextChangeAllowedAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        };
    }

    async createProfile(userId: string, dto: CreateProfileDto) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['profile'],
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        // Update user basic info
        user.name = dto.name;
        user.dateOfBirth = new Date(dto.dateOfBirth);
        user.gender = dto.gender;
        await this.userRepository.save(user);

        // Create or update profile
        let profile = user.profile;
        if (!profile) {
            profile = this.profileRepository.create({
                userId: user.id,
            });
        }

        profile.bio = dto.bio;
        profile.lookingFor = dto.lookingFor;
        profile.interests = dto.interests;
        profile.profileCompleteness = this.calculateProfileCompleteness(user, profile);

        await this.profileRepository.save(profile);

        return {
            success: true,
            user: this.mapUserToResponse(user),
            profile: {
                bio: profile.bio,
                lookingFor: profile.lookingFor,
                interests: profile.interests,
                completeness: profile.profileCompleteness,
            },
        };
    }

    async getMe(userId: string) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['profile', 'subscription'],
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        return {
            user: this.mapUserToResponse(user),
            profile: user.profile
                ? {
                    bio: user.profile.bio,
                    lookingFor: user.profile.lookingFor,
                    interests: user.profile.interests,
                    photos: user.profile.photos,
                    completeness: user.profile.profileCompleteness,
                }
                : null,
        };
    }

    // ==================== HELPER METHODS ====================

    private generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    private parseExpiresIn(expiresIn: string): number {
        const match = expiresIn.match(/^(\d+)([smhd])$/);
        if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days

        const value = parseInt(match[1], 10);
        const unit = match[2];

        switch (unit) {
            case 's':
                return value * 1000;
            case 'm':
                return value * 60 * 1000;
            case 'h':
                return value * 60 * 60 * 1000;
            case 'd':
                return value * 24 * 60 * 60 * 1000;
            default:
                return 7 * 24 * 60 * 60 * 1000;
        }
    }

    private isProfileComplete(user: User): boolean {
        return !!(user.name && user.dateOfBirth && user.gender && user.intent);
    }

    private calculateProfileCompleteness(user: User, profile: Profile): number {
        let score = 0;
        const weights = {
            name: 15,
            dateOfBirth: 10,
            gender: 10,
            intent: 10,
            bio: 15,
            lookingFor: 10,
            interests: 10,
            photos: 20,
        };

        if (user.name) score += weights.name;
        if (user.dateOfBirth) score += weights.dateOfBirth;
        if (user.gender) score += weights.gender;
        if (user.intent) score += weights.intent;
        if (profile.bio) score += weights.bio;
        if (profile.lookingFor) score += weights.lookingFor;
        if (profile.interests && profile.interests.length > 0) score += weights.interests;
        if (profile.photos && profile.photos.length > 0) {
            score += Math.min(profile.photos.length * 5, weights.photos);
        }

        return score;
    }

    private mapUserToResponse(user: User) {
        return {
            id: user.id,
            phone: user.phone,
            email: user.email,
            name: user.name,
            gender: user.gender,
            intent: user.intent,
            safetyScore: Number(user.safetyScore),
            isVerified: user.isVerified,
            currentPlan: user.currentPlan,
            profileComplete: this.isProfileComplete(user),
            createdAt: user.createdAt,
        };
    }

    // Development-only method to retrieve OTP
    async getDevOtp(identifier: string) {
        const isDev = this.configService.get('nodeEnv') !== 'production';

        if (!isDev) {
            throw new BadRequestException('This endpoint is only available in development mode');
        }

        // Find the latest unused OTP for this identifier
        const otp = await this.otpRepository.findOne({
            where: {
                identifier,
                isUsed: false,
                expiresAt: MoreThan(new Date()),
            },
            order: { createdAt: 'DESC' },
        });

        if (!otp || !otp.plainCode) {
            throw new BadRequestException('No active OTP found for this identifier');
        }

        const expiresInSeconds = Math.floor((otp.expiresAt.getTime() - Date.now()) / 1000);

        return {
            identifier,
            otp: otp.plainCode,
            purpose: otp.purpose,
            expiresInSeconds,
            createdAt: otp.createdAt,
        };
    }

    // Method for validating JWT tokens (used by guard)
    async validateUser(userId: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: { id: userId, isActive: true, isBanned: false },
        });
    }
}
