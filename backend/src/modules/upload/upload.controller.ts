import {
    Controller,
    Post,
    Delete,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiConsumes,
} from '@nestjs/swagger';
import { CloudinaryService } from './cloudinary.service';
import {
    UploadPhotoDto,
    UploadVideoDto,
    DeletePhotoDto,
    DeleteMultiplePhotosDto,
    UploadResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
    constructor(private readonly cloudinaryService: CloudinaryService) { }

    // ==================== PHOTO UPLOAD ====================

    @Post('photo')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Upload a photo to Cloudinary' })
    @ApiConsumes('application/json')
    @ApiResponse({
        status: 201,
        description: 'Photo uploaded successfully',
        type: UploadResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Invalid file or upload failed' })
    async uploadPhoto(
        @CurrentUser('id') userId: string,
        @Body() dto: UploadPhotoDto,
    ): Promise<UploadResponseDto> {
        const result = await this.cloudinaryService.uploadPhoto(
            dto.file,
            userId,
            { isProfile: dto.isProfile },
        );

        return {
            success: true,
            publicId: result.publicId,
            url: result.url,
            secureUrl: result.secureUrl,
            width: result.width,
            height: result.height,
        };
    }

    // ==================== VIDEO UPLOAD ====================

    @Post('video')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Upload a verification video to Cloudinary' })
    @ApiConsumes('application/json')
    @ApiResponse({
        status: 201,
        description: 'Video uploaded successfully',
        type: UploadResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Invalid file or upload failed' })
    async uploadVideo(
        @CurrentUser('id') userId: string,
        @Body() dto: UploadVideoDto,
    ): Promise<UploadResponseDto> {
        const result = await this.cloudinaryService.uploadVideo(
            dto.file,
            userId,
        );

        return {
            success: true,
            publicId: result.publicId,
            url: result.url,
            secureUrl: result.secureUrl,
            width: result.width,
            height: result.height,
        };
    }

    // ==================== DELETE ====================

    @Delete('photo')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete a photo from Cloudinary' })
    @ApiResponse({ status: 200, description: 'Photo deleted successfully' })
    async deletePhoto(
        @Body() dto: DeletePhotoDto,
    ): Promise<{ success: boolean }> {
        // Extract public_id if full URL was provided
        let publicId = dto.photoId;
        if (dto.photoId.includes('cloudinary.com')) {
            const extracted = this.cloudinaryService.extractPublicId(dto.photoId);
            if (extracted) {
                publicId = extracted;
            }
        }

        return this.cloudinaryService.deletePhoto(publicId);
    }

    @Delete('photos')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete multiple photos from Cloudinary' })
    @ApiResponse({ status: 200, description: 'Photos deleted successfully' })
    async deletePhotos(
        @Body() dto: DeleteMultiplePhotosDto,
    ): Promise<{ success: boolean }> {
        // Extract public_ids from URLs if needed
        const publicIds = dto.photoIds.map((id) => {
            if (id.includes('cloudinary.com')) {
                return this.cloudinaryService.extractPublicId(id) || id;
            }
            return id;
        });

        return this.cloudinaryService.deletePhotos(publicIds);
    }
}
