import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import {
  UpdateProfileDto,
  UpdatePhotosDto,
  AddPhotoDto,
  DeletePhotoDto,
  ReorderPhotosDto,
  UpdateLocationDto,
  UpdatePrivacyDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('profile')
@Controller('profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // ==================== GET PROFILE ====================

  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.profileService.getProfile(userId);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get public profile of another user' })
  @ApiResponse({ status: 200, description: 'Public user profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getPublicProfile(
    @CurrentUser('id') viewerId: string,
    @Param('userId') userId: string,
  ) {
    return this.profileService.getPublicProfile(userId, viewerId);
  }

  // ==================== UPDATE PROFILE ====================

  @Put()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(userId, dto);
  }

  // ==================== PHOTOS ====================

  @Put('photos')
  @ApiOperation({ summary: 'Replace all photos' })
  @ApiResponse({ status: 200, description: 'Photos updated' })
  async updatePhotos(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePhotosDto,
  ) {
    return this.profileService.updatePhotos(userId, dto);
  }

  @Post('photos')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a photo' })
  @ApiResponse({ status: 201, description: 'Photo added' })
  @ApiResponse({ status: 400, description: 'Max 6 photos allowed' })
  async addPhoto(@CurrentUser('id') userId: string, @Body() dto: AddPhotoDto) {
    return this.profileService.addPhoto(userId, dto);
  }

  @Delete('photos/:index')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a photo by index' })
  @ApiResponse({ status: 200, description: 'Photo deleted' })
  async deletePhoto(
    @CurrentUser('id') userId: string,
    @Param('index') index: string,
  ) {
    return this.profileService.deletePhoto(userId, parseInt(index, 10));
  }

  @Put('photos/reorder')
  @ApiOperation({ summary: 'Reorder photos' })
  @ApiResponse({ status: 200, description: 'Photos reordered' })
  async reorderPhotos(
    @CurrentUser('id') userId: string,
    @Body() dto: ReorderPhotosDto,
  ) {
    return this.profileService.reorderPhotos(userId, dto.order);
  }

  // ==================== LOCATION ====================

  @Put('location')
  @ApiOperation({ summary: 'Update user location' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  async updateLocation(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.profileService.updateLocation(userId, dto);
  }

  // ==================== PRIVACY ====================

  @Put('privacy')
  @ApiOperation({ summary: 'Update privacy settings' })
  @ApiResponse({ status: 200, description: 'Privacy updated' })
  async updatePrivacy(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePrivacyDto,
  ) {
    return this.profileService.updatePrivacy(userId, dto);
  }

  // ==================== INTERESTS ====================

  @Get('interests/suggestions')
  @ApiOperation({ summary: 'Get suggested interest tags' })
  @ApiResponse({ status: 200, description: 'List of interest suggestions' })
  async getInterestSuggestions() {
    return this.profileService.getInterestSuggestions();
  }
}
