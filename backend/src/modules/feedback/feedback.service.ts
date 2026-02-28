import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback, FeedbackStatus } from '../../database/entities/feedback.entity';
import { CreateFeedbackDto, UpdateFeedbackStatusDto } from './dto/feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
  ) {}

  // ==================== USER ENDPOINTS ====================

  async create(userId: string, dto: CreateFeedbackDto): Promise<Feedback> {
    const feedback = this.feedbackRepository.create({
      userId,
      type: dto.type,
      description: dto.description,
      status: FeedbackStatus.OPEN,
    });
    return this.feedbackRepository.save(feedback);
  }

  // ==================== ADMIN ENDPOINTS ====================

  async list(options: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
  }) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.feedbackRepository
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.user', 'user')
      .orderBy('feedback.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (options.status && options.status !== 'all') {
      qb.andWhere('feedback.status = :status', { status: options.status });
    }

    if (options.type && options.type !== 'all') {
      qb.andWhere('feedback.type = :type', { type: options.type });
    }

    const [feedbacks, total] = await qb.getManyAndCount();

    return {
      feedbacks: feedbacks.map((f) => ({
        id: f.id,
        type: f.type,
        description: f.description,
        status: f.status,
        adminNotes: f.adminNotes,
        resolvedBy: f.resolvedBy,
        resolvedAt: f.resolvedAt,
        createdAt: f.createdAt,
        userName: f.user?.name || 'Unknown',
        userEmail: f.user?.email || '',
        userId: f.userId,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateStatus(
    feedbackId: string,
    adminId: string,
    dto: UpdateFeedbackStatusDto,
  ): Promise<Feedback> {
    const feedback = await this.feedbackRepository.findOne({
      where: { id: feedbackId },
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    feedback.status = dto.status;
    if (dto.adminNotes) {
      feedback.adminNotes = dto.adminNotes;
    }

    if (
      dto.status === FeedbackStatus.RESOLVED ||
      dto.status === FeedbackStatus.CLOSED
    ) {
      feedback.resolvedBy = adminId;
      feedback.resolvedAt = new Date();
    }

    return this.feedbackRepository.save(feedback);
  }
}
