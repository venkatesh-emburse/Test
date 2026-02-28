import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  Matches,
  IsEmail,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserIntent, Gender } from '../../../database/entities/enums';

// Send OTP DTOs
export class SendPhoneOtpDto {
  @ApiProperty({
    example: '+919876543210',
    description: 'Phone number with country code',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +919876543210)',
  })
  phone: string;
}

export class SendEmailOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

// Verify OTP DTOs
export class VerifyPhoneOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone number must be in E.164 format',
  })
  phone: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  code: string;
}

export class VerifyEmailOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  code: string;
}

// Onboarding DTOs
export class SetIntentDto {
  @ApiProperty({ enum: UserIntent, example: UserIntent.LONG_TERM })
  @IsEnum(UserIntent)
  intent: UserIntent;
}

export class CreateProfileDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiProperty({
    example: '1995-06-15',
    description: 'Date of birth in YYYY-MM-DD format',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format',
  })
  dateOfBirth: string;

  @ApiProperty({ enum: Gender, example: Gender.MALE })
  @IsEnum(Gender)
  gender: Gender;

  @ApiPropertyOptional({
    example: 'Software engineer who loves travel and music.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({
    example: 'Looking for someone who shares my passion for adventure.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  lookingFor?: string;

  @ApiPropertyOptional({ example: ['travel', 'music', 'cooking', 'hiking'] })
  @IsOptional()
  interests?: string[];
}

// Token DTOs
export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

// Response DTOs
export class OtpSentResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'OTP sent successfully' })
  message: string;

  @ApiProperty({ example: 600, description: 'OTP expiry in seconds' })
  expiresIn: number;
}

// UserResponseDto must be defined BEFORE AuthTokensResponseDto
export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: Gender })
  gender: Gender;

  @ApiProperty({ enum: UserIntent })
  intent: UserIntent;

  @ApiProperty()
  safetyScore: number;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  profileComplete: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class AuthTokensResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  @ApiProperty({
    example: 604800,
    description: 'Access token expiry in seconds',
  })
  expiresIn: number;

  @ApiProperty({ description: 'User information', type: () => UserResponseDto })
  user: UserResponseDto;
}
