import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsOptional,
    IsNumber,
    Min,
    Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SignalType } from '../../../database/entities/enums';

// Send Signal DTO
export class SendSignalDto {
    @ApiProperty({ description: 'User ID to send signal to' })
    @IsString()
    @IsNotEmpty()
    targetUserId: string;

    @ApiProperty({ enum: SignalType, description: 'Type of signal' })
    @IsEnum(SignalType)
    signalType: SignalType;
}

// Get Signals Query DTO
export class GetSignalsQueryDto {
    @ApiPropertyOptional({ enum: SignalType, description: 'Filter by signal type' })
    @IsOptional()
    @IsEnum(SignalType)
    type?: SignalType;

    @ApiPropertyOptional({ default: 20, description: 'Limit results' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(50)
    @Type(() => Number)
    limit?: number;

    @ApiPropertyOptional({ default: 0, description: 'Offset for pagination' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    offset?: number;
}

// Response DTOs
export class SignalResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty({ enum: SignalType })
    signalType: SignalType;

    @ApiProperty()
    fromUser: {
        id: string;
        name: string;
        photos?: string[];
        isVerified: boolean;
    };

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    isNew: boolean;
}

export class SentSignalResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty({ enum: SignalType })
    signalType: SignalType;

    @ApiProperty()
    toUser: {
        id: string;
        name: string;
        photos?: string[];
    };

    @ApiProperty()
    createdAt: Date;
}

export class SignalSummaryDto {
    @ApiProperty()
    totalReceived: number;

    @ApiProperty()
    newCount: number;

    @ApiProperty()
    byType: {
        wave: number;
        interested: number;
        viewed: number;
    };
}

export class SendSignalResponseDto {
    @ApiProperty()
    success: boolean;

    @ApiProperty()
    signalId: string;

    @ApiProperty()
    message: string;

    @ApiPropertyOptional({ description: 'True if mutual interest detected' })
    isMutual?: boolean;
}
