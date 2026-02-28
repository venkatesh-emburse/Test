import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LocationService } from './location.service';
import { GetNearbyUsersQueryDto, GetUsersInBoundsQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('location')
@Controller('location')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  // ==================== NEARBY USERS ====================

  @Get('nearby')
  @ApiOperation({ summary: 'Get nearby users (radar view)' })
  @ApiResponse({
    status: 200,
    description: 'List of nearby users with distance',
  })
  async getNearbyUsers(
    @CurrentUser('id') userId: string,
    @Query() query: GetNearbyUsersQueryDto,
  ) {
    return this.locationService.getNearbyUsers(userId, query);
  }

  // ==================== MAP VIEW ====================

  @Get('bounds')
  @ApiOperation({ summary: 'Get users within map bounds' })
  @ApiResponse({ status: 200, description: 'List of users in bounds' })
  async getUsersInBounds(
    @CurrentUser('id') userId: string,
    @Query() query: GetUsersInBoundsQueryDto,
  ) {
    return this.locationService.getUsersInBounds(userId, query);
  }

  // ==================== MAP CONFIG ====================

  @Get('map/config')
  @ApiOperation({ summary: 'Get map configuration (tile server, zoom)' })
  @ApiResponse({ status: 200, description: 'Map configuration' })
  async getMapConfig() {
    return this.locationService.getMapConfig();
  }

  @Get('map/styles')
  @ApiOperation({ summary: 'Get available map styles' })
  @ApiResponse({ status: 200, description: 'Available map tile styles' })
  async getMapStyles() {
    return this.locationService.getMapStyles();
  }
}
