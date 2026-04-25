import {
  IsIn,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SwipeAction } from '../../../database/entities/enums';

// Discovery Query DTO
export class DiscoveryQueryDto {
  @ApiPropertyOptional({ example: 18, description: 'Minimum age filter' })
  @IsOptional()
  @IsNumber()
  @Min(18)
  @Type(() => Number)
  minAge?: number;

  @ApiPropertyOptional({ example: 35, description: 'Maximum age filter' })
  @IsOptional()
  @IsNumber()
  @Max(100)
  @Type(() => Number)
  maxAge?: number;

  @ApiPropertyOptional({ example: 30, description: 'Maximum distance in km' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  maxDistance?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of profiles to fetch',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ example: 0, description: 'Offset for pagination' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}

// Swipe DTO
export class SwipeDto {
  @ApiProperty({ description: 'ID of the user being swiped on' })
  @IsString()
  targetUserId: string;

  @ApiProperty({ enum: [SwipeAction.LIKE, SwipeAction.PASS], example: SwipeAction.LIKE })
  @IsIn([SwipeAction.LIKE, SwipeAction.PASS])
  action: SwipeAction;
}

// Response DTOs
export class DiscoveryProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  age: number;

  @ApiProperty()
  gender: string;

  @ApiProperty()
  intent: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiPropertyOptional()
  lookingFor?: string;

  @ApiPropertyOptional()
  interests?: string[];

  @ApiPropertyOptional()
  photos?: string[];

  @ApiProperty()
  safetyScore: number;

  @ApiProperty()
  isVerified: boolean;

  @ApiPropertyOptional({
    description: 'Distance in km (if location available)',
  })
  distanceKm?: number;

  @ApiProperty({ description: 'Compatibility score 0-100' })
  compatibilityScore: number;

  @ApiPropertyOptional({ description: 'Account creation date for "member since"' })
  createdAt?: Date;
}

export class SwipeResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ enum: SwipeAction })
  action: SwipeAction;

  @ApiProperty({ description: 'Whether this swipe resulted in a match' })
  isMatch: boolean;

  @ApiPropertyOptional({ description: 'Match details if isMatch is true' })
  match?: {
    id: string;
    matchedAt: Date;
    user: {
      id: string;
      name: string;
      photos?: string[];
    };
  };
}

export class MatchDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  matchedAt: Date;

  @ApiProperty()
  microDateCompleted: boolean;

  @ApiProperty()
  chatUnlocked: boolean;

  @ApiProperty()
  otherUser: {
    id: string;
    name: string;
    photos?: string[];
    safetyScore: number;
    isVerified: boolean;
  };
}

export class LikeDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  age: number;

  @ApiProperty()
  intent: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiProperty({ type: [String] })
  photos: string[];

  @ApiProperty()
  safetyScore: number;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  likedAt: Date;
}
