import {
  Controller,
  Get,
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
import { DiscoveryService } from './discovery.service';
import { DiscoveryQueryDto, SwipeDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('discovery')
@Controller('discovery')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  // ==================== DISCOVERY ====================

  @Get('profiles')
  @ApiOperation({ summary: 'Get profiles for discovery (swiping)' })
  @ApiResponse({ status: 200, description: 'List of potential matches' })
  async getDiscoveryProfiles(
    @CurrentUser('id') userId: string,
    @Query() query: DiscoveryQueryDto,
  ) {
    return this.discoveryService.getDiscoveryProfiles(userId, query);
  }

  // ==================== SWIPE ====================

  @Post('swipe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Swipe on a profile (like or pass)' })
  @ApiResponse({ status: 200, description: 'Swipe recorded, returns isMatch' })
  @ApiResponse({ status: 400, description: 'Already swiped or invalid' })
  @ApiResponse({
    status: 403,
    description: 'Daily limit reached or feature not available',
  })
  async swipe(@CurrentUser('id') userId: string, @Body() dto: SwipeDto) {
    return this.discoveryService.swipe(userId, dto);
  }

  @Get('likes')
  @ApiOperation({ summary: 'Get pending likes received by the current user' })
  @ApiResponse({ status: 200, description: 'List of users who liked you' })
  async getReceivedLikes(@CurrentUser('id') userId: string) {
    return this.discoveryService.getReceivedLikes(userId);
  }

  // ==================== MATCHES ====================

  @Get('matches')
  @ApiOperation({ summary: 'Get all matches' })
  @ApiResponse({ status: 200, description: 'List of matches' })
  async getMatches(@CurrentUser('id') userId: string) {
    return this.discoveryService.getMatches(userId);
  }

  @Get('matches/:matchId')
  @ApiOperation({ summary: 'Get a specific match details' })
  @ApiResponse({ status: 200, description: 'Match details' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  async getMatch(
    @CurrentUser('id') userId: string,
    @Param('matchId') matchId: string,
  ) {
    return this.discoveryService.getMatch(userId, matchId);
  }

  @Delete('matches/:matchId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unmatch with a user' })
  @ApiResponse({ status: 200, description: 'Unmatched successfully' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  async unmatch(
    @CurrentUser('id') userId: string,
    @Param('matchId') matchId: string,
  ) {
    return this.discoveryService.unmatch(userId, matchId);
  }
}
