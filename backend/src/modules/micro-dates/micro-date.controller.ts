import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
import { MicroDateService } from './micro-date.service';
import { SubmitMicroDateAnswerDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('micro-dates')
@Controller('micro-dates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MicroDateController {
  constructor(private readonly microDateService: MicroDateService) {}

  // ==================== GAMES ====================

  @Get('games')
  @ApiOperation({ summary: 'Get all available micro-date games' })
  @ApiResponse({ status: 200, description: 'List of available games' })
  async getAvailableGames() {
    return this.microDateService.getAvailableGames();
  }

  @Get('pending')
  @ApiOperation({
    summary: 'Get matches with pending micro-date games (not yet answered)',
  })
  @ApiResponse({ status: 200, description: 'List of pending games' })
  async getPendingGames(@CurrentUser('id') userId: string) {
    return this.microDateService.getPendingGames(userId);
  }

  // ==================== MATCH GAME ====================

  @Get('match/:matchId')
  @ApiOperation({ summary: 'Get micro-date game for a specific match' })
  @ApiResponse({ status: 200, description: 'Game details and status' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  async getGame(
    @CurrentUser('id') userId: string,
    @Param('matchId') matchId: string,
  ) {
    return this.microDateService.getGame(userId, matchId);
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit answer for micro-date game' })
  @ApiResponse({ status: 200, description: 'Answer submitted' })
  @ApiResponse({ status: 400, description: 'Already answered or invalid' })
  async submitAnswer(
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitMicroDateAnswerDto,
  ) {
    return this.microDateService.submitAnswer(userId, dto);
  }
}
