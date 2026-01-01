import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsUrl,
    IsNumber,
    IsEnum,
    IsArray,
    Min,
    Max,
    MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ReportReason, VerificationStatus } from '../../../database/entities/enums';

// ==================== VERIFICATION DTOs ====================

// Start Video Verification DTO
export class StartVerificationDto {
    @ApiPropertyOptional({ description: 'Device info for tracking' })
    @IsOptional()
    @IsString()
    deviceInfo?: string;
}

// Submit Video Verification DTO
export class SubmitVerificationDto {
    @ApiProperty({ description: 'Verification session ID' })
    @IsString()
    @IsNotEmpty()
    sessionId: string;

    @ApiProperty({ description: 'Video URL from client upload' })
    @IsUrl()
    videoUrl: string;

    @ApiProperty({ description: 'Phrase that was displayed to the user' })
    @IsString()
    @IsNotEmpty()
    phraseShown: string;

    @ApiPropertyOptional({ description: 'Phrase detected from speech (client-side processing)' })
    @IsOptional()
    @IsString()
    phraseDetected?: string;
}

// Manual Verification Review (Admin)
export class ReviewVerificationDto {
    @ApiProperty({ description: 'Verification ID' })
    @IsString()
    @IsNotEmpty()
    verificationId: string;

    @ApiProperty({ enum: VerificationStatus })
    @IsEnum(VerificationStatus)
    status: VerificationStatus;

    @ApiPropertyOptional({ description: 'Admin notes' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;
}

// ==================== REPORT DTOs ====================

// Submit Report DTO
export class SubmitReportDto {
    @ApiProperty({ description: 'ID of user being reported' })
    @IsString()
    @IsNotEmpty()
    reportedUserId: string;

    @ApiProperty({ enum: ReportReason })
    @IsEnum(ReportReason)
    reason: ReportReason;

    @ApiPropertyOptional({ description: 'Additional details', maxLength: 1000 })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;

    @ApiPropertyOptional({ description: 'Evidence URLs (screenshots, etc.)' })
    @IsOptional()
    @IsArray()
    @IsUrl({}, { each: true })
    evidenceUrls?: string[];
}

// Block User DTO
export class BlockUserDto {
    @ApiProperty({ description: 'ID of user to block' })
    @IsString()
    @IsNotEmpty()
    userId: string;
}

// ==================== RESPONSE DTOs ====================

export class StartVerificationResponseDto {
    @ApiProperty()
    sessionId: string;

    @ApiProperty({ description: 'Random phrase to speak' })
    phrase: string;

    @ApiProperty({ description: 'Expires at timestamp' })
    expiresAt: Date;

    @ApiProperty({ description: 'Instructions for the user' })
    instructions: string;
}

export class VerificationStatusDto {
    @ApiProperty()
    hasVerification: boolean;

    @ApiPropertyOptional({ enum: VerificationStatus })
    status?: VerificationStatus;

    @ApiPropertyOptional()
    verifiedAt?: Date;

    @ApiPropertyOptional()
    safetyScore?: number;

    @ApiProperty()
    canResubmit: boolean;
}

export class SafetyScoreBreakdownDto {
    @ApiProperty({ description: 'Total safety score (0-100)' })
    totalScore: number;

    @ApiProperty()
    breakdown: {
        videoVerification: number; // 0-40
        profileCompleteness: number; // 0-20
        accountAge: number; // 0-15
        chatBehavior: number; // 0-15
        reportPenalty: number; // 0 to -30
    };

    @ApiProperty()
    isVerified: boolean;

    @ApiProperty()
    lastUpdated: Date;
}

export class ReportResponseDto {
    @ApiProperty()
    success: boolean;

    @ApiProperty()
    reportId: string;

    @ApiProperty()
    message: string;
}

// Verification phrases (random selection)
export const VERIFICATION_PHRASES = [
    'I am a real person looking for connection',
    'Today is a beautiful day to meet someone new',
    'Hello, I am here to find my special someone',
    'Life is an adventure worth sharing',
    'I believe in genuine connections',
    'Every day is a chance for new beginnings',
    'I am excited to start this journey',
    'Authenticity is my superpower',
    'Love starts with being real',
    'Here to find something meaningful',
];
