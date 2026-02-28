import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Match } from '../../database/entities/match.entity';
import { User } from '../../database/entities/user.entity';
import {
  SubmitMicroDateAnswerDto,
  MICRO_DATE_GAMES,
  MicroDateGameConfig,
} from './dto';

@Injectable()
export class MicroDateService {
  constructor(
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // ==================== GET GAME ====================

  async getGame(userId: string, matchId: string) {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: ['user1', 'user2'],
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Verify user is part of this match
    const isUser1 = match.user1Id === userId;
    const isUser2 = match.user2Id === userId;

    if (!isUser1 && !isUser2) {
      throw new ForbiddenException('Not authorized to access this match');
    }

    if (!match.isActive) {
      throw new BadRequestException('Match is no longer active');
    }

    const gameType = match.microDateGame || 'two_truths_lie';
    const gameConfig =
      MICRO_DATE_GAMES[gameType] || MICRO_DATE_GAMES['two_truths_lie'];

    // Determine answer status
    const myAnswer = isUser1 ? match.user1Answer : match.user2Answer;
    const theirAnswer = isUser1 ? match.user2Answer : match.user1Answer;

    const hasAnswered = !!myAnswer;
    const otherUserAnswered = !!theirAnswer;
    const isCompleted = hasAnswered && otherUserAnswered;

    // Only show answers if both have answered
    const answers = isCompleted
      ? {
          myAnswer,
          theirAnswer,
        }
      : undefined;

    return {
      matchId: match.id,
      gameType,
      gameConfig,
      hasAnswered,
      otherUserAnswered,
      isCompleted,
      chatUnlocked: match.chatUnlocked,
      answers,
      otherUser: {
        id: isUser1 ? match.user2.id : match.user1.id,
        name: isUser1 ? match.user2.name : match.user1.name,
      },
    };
  }

  // ==================== SUBMIT ANSWER ====================

  async submitAnswer(userId: string, dto: SubmitMicroDateAnswerDto) {
    const { matchId, answer } = dto;

    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: ['user1', 'user1.profile', 'user2', 'user2.profile'],
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Verify user is part of this match
    const isUser1 = match.user1Id === userId;
    const isUser2 = match.user2Id === userId;

    if (!isUser1 && !isUser2) {
      throw new ForbiddenException('Not authorized to access this match');
    }

    if (!match.isActive) {
      throw new BadRequestException('Match is no longer active');
    }

    // Check if already answered
    const existingAnswer = isUser1 ? match.user1Answer : match.user2Answer;
    if (existingAnswer) {
      throw new BadRequestException('You have already submitted your answer');
    }

    // Save the answer
    if (isUser1) {
      match.user1Answer = answer;
    } else {
      match.user2Answer = answer;
    }

    // Check if game is now complete
    const otherAnswer = isUser1 ? match.user2Answer : match.user1Answer;
    const gameCompleted = !!otherAnswer;

    if (gameCompleted) {
      match.microDateCompleted = true;
      match.chatUnlocked = true;
    }

    await this.matchRepository.save(match);

    // Prepare response
    const response: any = {
      success: true,
      message: gameCompleted
        ? 'Game completed! Chat is now unlocked 🎉'
        : 'Answer submitted! Waiting for your match to respond.',
      gameCompleted,
      chatUnlocked: match.chatUnlocked,
    };

    // Include answers if game completed
    if (gameCompleted) {
      response.answers = {
        myAnswer: answer,
        theirAnswer: otherAnswer,
      };
    }

    return response;
  }

  // ==================== GET ALL GAMES ====================

  async getAvailableGames(): Promise<Record<string, MicroDateGameConfig>> {
    return MICRO_DATE_GAMES;
  }

  // ==================== GET PENDING GAMES ====================

  async getPendingGames(userId: string) {
    // Get matches where user hasn't answered yet
    const matches = await this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.user1', 'user1')
      .leftJoinAndSelect('match.user2', 'user2')
      .where('(match.user1Id = :userId OR match.user2Id = :userId)', { userId })
      .andWhere('match.isActive = :isActive', { isActive: true })
      .andWhere('match.microDateCompleted = :completed', { completed: false })
      .orderBy('match.matchedAt', 'DESC')
      .getMany();

    return matches
      .filter((match) => {
        const isUser1 = match.user1Id === userId;
        const myAnswer = isUser1 ? match.user1Answer : match.user2Answer;
        return !myAnswer; // Only include if user hasn't answered
      })
      .map((match) => {
        const isUser1 = match.user1Id === userId;
        const otherUser = isUser1 ? match.user2 : match.user1;
        const gameType = match.microDateGame || 'two_truths_lie';

        return {
          matchId: match.id,
          gameType,
          gameTitle: MICRO_DATE_GAMES[gameType]?.title || 'Unknown Game',
          otherUser: {
            id: otherUser.id,
            name: otherUser.name,
          },
          matchedAt: match.matchedAt,
        };
      });
  }
}
