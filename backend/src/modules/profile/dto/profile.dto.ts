import {
    IsString,
    IsOptional,
    IsArray,
    IsNumber,
    Min,
    Max,
    IsUrl,
    MaxLength,
    ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Update Profile DTO
export class UpdateProfileDto {
    @ApiPropertyOptional({ example: 'John Doe', maxLength: 100 })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    name?: string;

    @ApiPropertyOptional({ example: 'Love hiking and coffee ☕', maxLength: 500 })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    bio?: string;

    @ApiPropertyOptional({ example: 'Looking for someone who loves adventure', maxLength: 200 })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    lookingFor?: string;

    @ApiPropertyOptional({ example: 175, description: 'Height in cm' })
    @IsOptional()
    @IsNumber()
    @Min(100)
    @Max(250)
    @Type(() => Number)
    height?: number;

    @ApiPropertyOptional({ example: 'Software Engineer' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    occupation?: string;

    @ApiPropertyOptional({ example: 'MIT' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    education?: string;

    @ApiPropertyOptional({ example: ['travel', 'music', 'coffee'], maxItems: 10 })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(10)
    interests?: string[];
}

// Update Photos DTO
export class UpdatePhotosDto {
    @ApiProperty({
        description: 'Array of photo URLs (max 6)',
        example: ['https://s3.bucket/photo1.jpg', 'https://s3.bucket/photo2.jpg'],
    })
    @IsArray()
    @IsUrl({}, { each: true })
    @ArrayMaxSize(6)
    photos: string[];
}

// Add Photo DTO
export class AddPhotoDto {
    @ApiProperty({ description: 'Photo URL to add' })
    @IsUrl()
    photoUrl: string;
}

// Delete Photo DTO
export class DeletePhotoDto {
    @ApiProperty({ description: 'Index of photo to delete (0-5)' })
    @IsNumber()
    @Min(0)
    @Max(5)
    @Type(() => Number)
    index: number;
}

// Reorder Photos DTO
export class ReorderPhotosDto {
    @ApiProperty({ description: 'New order of photo indices', example: [2, 0, 1, 3] })
    @IsArray()
    @IsNumber({}, { each: true })
    order: number[];
}

// Location Update DTO
export class UpdateLocationDto {
    @ApiProperty({ example: 12.9716, description: 'Latitude' })
    @IsNumber()
    @Min(-90)
    @Max(90)
    @Type(() => Number)
    latitude: number;

    @ApiProperty({ example: 77.5946, description: 'Longitude' })
    @IsNumber()
    @Min(-180)
    @Max(180)
    @Type(() => Number)
    longitude: number;
}

// Privacy Settings DTO
export class UpdatePrivacyDto {
    @ApiPropertyOptional({ description: 'Show on map (default: false for women)' })
    @IsOptional()
    showOnMap?: boolean;

    @ApiPropertyOptional({ description: 'Invisible mode (hide from discovery)' })
    @IsOptional()
    isInvisible?: boolean;
}

// Response DTOs
export class ProfileResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiPropertyOptional()
    bio?: string;

    @ApiPropertyOptional()
    lookingFor?: string;

    @ApiPropertyOptional()
    height?: number;

    @ApiPropertyOptional()
    occupation?: string;

    @ApiPropertyOptional()
    education?: string;

    @ApiPropertyOptional()
    photos?: string[];

    @ApiPropertyOptional()
    interests?: string[];

    @ApiProperty()
    profileCompleteness: number;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}

export class FullUserProfileDto {
    @ApiProperty()
    user: {
        id: string;
        name: string;
        phone?: string;
        email?: string;
        gender: string;
        dateOfBirth?: Date;
        intent: string;
        safetyScore: number;
        isVerified: boolean;
        currentPlan: string;
        lastActiveAt?: Date;
    };

    @ApiProperty()
    profile: ProfileResponseDto;

    @ApiProperty()
    privacy: {
        showOnMap: boolean;
        isInvisible: boolean;
    };
}
