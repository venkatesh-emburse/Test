import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/feedback.dto';

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit feedback or bug report' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFeedbackDto,
  ) {
    const feedback = await this.feedbackService.create(userId, dto);
    return { message: 'Feedback submitted successfully', id: feedback.id };
  }
}
