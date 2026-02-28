import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Upload Photo DTO
export class UploadPhotoDto {
  @ApiProperty({
    description: 'Base64 encoded image data (with or without data URI prefix)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  })
  @IsString()
  @IsNotEmpty()
  file: string;

  @ApiPropertyOptional({
    description: 'Whether this is a profile photo',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isProfile?: boolean;
}

// Upload Video DTO
export class UploadVideoDto {
  @ApiProperty({
    description: 'Base64 encoded video data',
  })
  @IsString()
  @IsNotEmpty()
  file: string;
}

// Delete Photo DTO
export class DeletePhotoDto {
  @ApiProperty({
    description: 'Cloudinary public_id or full URL of the photo to delete',
  })
  @IsString()
  @IsNotEmpty()
  photoId: string;
}

// Upload Response DTO
export class UploadResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  publicId: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  secureUrl: string;

  @ApiPropertyOptional()
  width?: number;

  @ApiPropertyOptional()
  height?: number;
}

// Multiple Photos Delete DTO
export class DeleteMultiplePhotosDto {
  @ApiProperty({
    description: 'Array of Cloudinary public_ids or URLs to delete',
    type: [String],
  })
  @IsString({ each: true })
  photoIds: string[];
}
