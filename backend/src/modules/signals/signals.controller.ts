import {
  Controller,
  Get,
  Post,
  Body,
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
import { SignalsService } from './signals.service';
import { SendSignalDto, GetSignalsQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('signals')
@Controller('signals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  // ==================== SEND SIGNAL ====================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a signal (wave, interested, viewed)' })
  @ApiResponse({ status: 201, description: 'Signal sent' })
  @ApiResponse({ status: 400, description: 'Already sent today' })
  async sendSignal(
    @CurrentUser('id') userId: string,
    @Body() dto: SendSignalDto,
  ) {
    return this.signalsService.sendSignal(userId, dto);
  }

  // ==================== RECEIVED SIGNALS ====================

  @Get('received')
  @ApiOperation({ summary: 'Get signals received from others' })
  @ApiResponse({ status: 200, description: 'List of received signals' })
  async getReceivedSignals(
    @CurrentUser('id') userId: string,
    @Query() query: GetSignalsQueryDto,
  ) {
    return this.signalsService.getReceivedSignals(userId, query);
  }

  // ==================== SENT SIGNALS ====================

  @Get('sent')
  @ApiOperation({ summary: 'Get signals you have sent' })
  @ApiResponse({ status: 200, description: 'List of sent signals' })
  async getSentSignals(
    @CurrentUser('id') userId: string,
    @Query() query: GetSignalsQueryDto,
  ) {
    return this.signalsService.getSentSignals(userId, query);
  }

  // ==================== SUMMARY ====================

  @Get('summary')
  @ApiOperation({ summary: 'Get signals summary (counts by type)' })
  @ApiResponse({ status: 200, description: 'Signal summary' })
  async getSignalSummary(@CurrentUser('id') userId: string) {
    return this.signalsService.getSignalSummary(userId);
  }

  // ==================== WHO VIEWED ME ====================

  @Get('views')
  @ApiOperation({ summary: 'Get who viewed your profile' })
  @ApiResponse({ status: 200, description: 'List of profile viewers' })
  async getWhoViewedMe(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.signalsService.getWhoViewedMe(userId, limit || 10);
  }

  // ==================== WAVE SHORTCUT ====================

  @Post('wave/:targetUserId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Wave at a user (shortcut)' })
  @ApiResponse({ status: 200, description: 'Wave sent' })
  async sendWave(
    @CurrentUser('id') userId: string,
    @Query('targetUserId') targetUserId: string,
  ) {
    return this.signalsService.sendSignal(userId, {
      targetUserId,
      signalType: 'wave' as any,
    });
  }
}
