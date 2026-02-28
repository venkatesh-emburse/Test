import { IsNumber, IsOptional, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Get Nearby Users Query DTO
export class GetNearbyUsersQueryDto {
  @ApiProperty({ example: 12.9716, description: 'User latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude: number;

  @ApiProperty({ example: 77.5946, description: 'User longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude: number;

  @ApiPropertyOptional({
    example: 0.3,
    description: 'Radius in kilometers (max 50)',
    default: 0.3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(50)
  @Type(() => Number)
  radiusKm?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Max users to return',
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Only show verified users',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  verifiedOnly?: boolean;

  @ApiPropertyOptional({
    example: 60,
    description: 'Only users active within last N minutes',
    default: 60,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1440)
  @Type(() => Number)
  activeWithinMinutes?: number;
}

// Response DTOs
export class NearbyUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  age: number;

  @ApiPropertyOptional()
  photos?: string[];

  @ApiProperty()
  gender: string;

  @ApiProperty()
  intent: string;

  @ApiProperty()
  safetyScore: number;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty({ description: 'Distance in kilometers' })
  distanceKm: number;

  @ApiPropertyOptional({
    description: 'Approximate location (privacy-protected)',
  })
  approximateLocation?: {
    latitude: number;
    longitude: number;
  };

  @ApiPropertyOptional()
  bio?: string;

  @ApiPropertyOptional()
  interests?: string[];

  @ApiProperty()
  lastActiveAt?: Date;
}

export class MapBoundsDto {
  @ApiProperty({ description: 'North latitude' })
  @IsNumber()
  @Type(() => Number)
  north: number;

  @ApiProperty({ description: 'South latitude' })
  @IsNumber()
  @Type(() => Number)
  south: number;

  @ApiProperty({ description: 'East longitude' })
  @IsNumber()
  @Type(() => Number)
  east: number;

  @ApiProperty({ description: 'West longitude' })
  @IsNumber()
  @Type(() => Number)
  west: number;
}

export class GetUsersInBoundsQueryDto {
  @ApiProperty({ example: 13.0, description: 'North latitude' })
  @IsNumber()
  @Type(() => Number)
  north: number;

  @ApiProperty({ example: 12.9, description: 'South latitude' })
  @IsNumber()
  @Type(() => Number)
  south: number;

  @ApiProperty({ example: 77.7, description: 'East longitude' })
  @IsNumber()
  @Type(() => Number)
  east: number;

  @ApiProperty({ example: 77.5, description: 'West longitude' })
  @IsNumber()
  @Type(() => Number)
  west: number;

  @ApiPropertyOptional({ example: 30, default: 30 })
  @IsOptional()
  @IsNumber()
  @Max(50)
  @Type(() => Number)
  limit?: number;
}

export class MapConfigDto {
  @ApiProperty({ description: 'Tile server URL for map rendering' })
  tileServerUrl: string;

  @ApiProperty({ description: 'Attribution text' })
  attribution: string;

  @ApiProperty({ description: 'Default zoom level' })
  defaultZoom: number;

  @ApiProperty({ description: 'Min zoom level' })
  minZoom: number;

  @ApiProperty({ description: 'Max zoom level' })
  maxZoom: number;
}
