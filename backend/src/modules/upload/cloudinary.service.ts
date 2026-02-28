import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
}

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('cloudinary.cloudName'),
      api_key: this.configService.get<string>('cloudinary.apiKey'),
      api_secret: this.configService.get<string>('cloudinary.apiSecret'),
    });
  }

  /**
   * Upload a photo to Cloudinary
   * @param file - Base64 encoded image or file path/URL
   * @param userId - User ID for organizing photos
   * @param options - Additional upload options
   */
  async uploadPhoto(
    file: string,
    userId: string,
    options?: { isProfile?: boolean },
  ): Promise<CloudinaryUploadResult> {
    try {
      // Add data URI prefix if it's raw base64
      const fileToUpload = file.startsWith('data:')
        ? file
        : `data:image/jpeg;base64,${file}`;

      const result: UploadApiResponse = await cloudinary.uploader.upload(
        fileToUpload,
        {
          folder: `liveconnect/users/${userId}/photos`,
          resource_type: 'image',
          // Transformations for optimization
          transformation: [
            { width: 1080, height: 1350, crop: 'limit' }, // Max dimensions
            { quality: 'auto:good' }, // Auto quality
            { fetch_format: 'auto' }, // Auto format (webp when supported)
          ],
          // Ensure photos are marked for user
          tags: [userId, options?.isProfile ? 'profile' : 'photo'],
        },
      );

      return {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
      };
    } catch (error: any) {
      console.error('Cloudinary upload error:', error);
      throw new BadRequestException(error.message || 'Failed to upload photo');
    }
  }

  /**
   * Upload a verification video to Cloudinary
   */
  async uploadVideo(
    file: string,
    userId: string,
  ): Promise<CloudinaryUploadResult> {
    try {
      const result: UploadApiResponse = await cloudinary.uploader.upload(file, {
        folder: `liveconnect/users/${userId}/verification`,
        resource_type: 'video',
        // Video transformations
        transformation: [
          { width: 720, height: 1280, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
          { video_codec: 'auto' },
        ],
        tags: [userId, 'verification'],
      });

      return {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
      };
    } catch (error: any) {
      console.error('Cloudinary video upload error:', error);
      throw new BadRequestException(error.message || 'Failed to upload video');
    }
  }

  /**
   * Delete a photo from Cloudinary
   * @param publicId - The public_id of the image to delete
   */
  async deletePhoto(publicId: string): Promise<{ success: boolean }> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return { success: result.result === 'ok' };
    } catch (error: any) {
      console.error('Cloudinary delete error:', error);
      // Don't throw - just log the error
      return { success: false };
    }
  }

  /**
   * Delete multiple photos from Cloudinary
   */
  async deletePhotos(publicIds: string[]): Promise<{ success: boolean }> {
    try {
      if (publicIds.length === 0) return { success: true };

      await cloudinary.api.delete_resources(publicIds);
      return { success: true };
    } catch (error: any) {
      console.error('Cloudinary bulk delete error:', error);
      return { success: false };
    }
  }

  /**
   * Extract public_id from Cloudinary URL
   */
  extractPublicId(url: string): string | null {
    try {
      // Cloudinary URLs look like:
      // https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
      const regex = /\/upload\/(?:v\d+\/)?(.+)\.\w+$/;
      const match = url.match(regex);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Get optimized URL for a photo
   */
  getOptimizedUrl(
    publicId: string,
    options?: { width?: number; height?: number },
  ): string {
    return cloudinary.url(publicId, {
      transformation: [
        {
          width: options?.width || 400,
          height: options?.height || 500,
          crop: 'fill',
          gravity: 'face',
        },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
      secure: true,
    });
  }

  /**
   * Get thumbnail URL for a photo
   */
  getThumbnailUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      transformation: [
        { width: 150, height: 150, crop: 'thumb', gravity: 'face' },
        { quality: 'auto:low' },
        { fetch_format: 'auto' },
      ],
      secure: true,
    });
  }
}
