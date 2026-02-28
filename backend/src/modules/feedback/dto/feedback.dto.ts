import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { FeedbackType, FeedbackStatus } from '../../../database/entities/feedback.entity';

export class CreateFeedbackDto {
  @IsEnum(FeedbackType)
  type: FeedbackType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;
}

export class UpdateFeedbackStatusDto {
  @IsEnum(FeedbackStatus)
  status: FeedbackStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNotes?: string;
}
