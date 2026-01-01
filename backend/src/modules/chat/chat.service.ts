import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';

import { Message } from '../../database/entities/message.entity';
import { Match } from '../../database/entities/match.entity';
import { User } from '../../database/entities/user.entity';
import { SendMessageDto, GetMessagesQueryDto, MessageDto, ConversationDto } from './dto';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(Message)
        private messageRepository: Repository<Message>,
        @InjectRepository(Match)
        private matchRepository: Repository<Match>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }

    // ==================== SEND MESSAGE ====================

    async sendMessage(userId: string, dto: SendMessageDto): Promise<Message> {
        const { matchId, content } = dto;

        // Validate match and chat access
        const match = await this.validateChatAccess(userId, matchId);

        // Create and save message
        const message = this.messageRepository.create({
            matchId,
            senderId: userId,
            content: content.trim(),
        });

        return this.messageRepository.save(message);
    }

    // ==================== GET MESSAGES ====================

    async getMessages(
        userId: string,
        matchId: string,
        query: GetMessagesQueryDto,
    ): Promise<{ messages: MessageDto[]; hasMore: boolean }> {
        // Validate access
        await this.validateChatAccess(userId, matchId);

        const limit = query.limit || 20;

        // Build query
        const queryBuilder = this.messageRepository
            .createQueryBuilder('message')
            .where('message.matchId = :matchId', { matchId })
            .andWhere('message.isDeleted = :isDeleted', { isDeleted: false })
            .orderBy('message.createdAt', 'DESC')
            .take(limit + 1); // Fetch one extra to check hasMore

        // Pagination cursor
        if (query.before) {
            const beforeMessage = await this.messageRepository.findOne({
                where: { id: query.before },
            });
            if (beforeMessage) {
                queryBuilder.andWhere('message.createdAt < :cursor', {
                    cursor: beforeMessage.createdAt,
                });
            }
        }

        const messages = await queryBuilder.getMany();

        const hasMore = messages.length > limit;
        if (hasMore) {
            messages.pop(); // Remove extra
        }

        // Map to DTO
        const messageDtos = messages.map((msg) => this.mapToMessageDto(msg, userId));

        return { messages: messageDtos, hasMore };
    }

    // ==================== GET CONVERSATIONS ====================

    async getConversations(userId: string): Promise<ConversationDto[]> {
        // Get all matches with chat unlocked
        const matches = await this.matchRepository
            .createQueryBuilder('match')
            .leftJoinAndSelect('match.user1', 'user1')
            .leftJoinAndSelect('user1.profile', 'profile1')
            .leftJoinAndSelect('match.user2', 'user2')
            .leftJoinAndSelect('user2.profile', 'profile2')
            .where('(match.user1Id = :userId OR match.user2Id = :userId)', { userId })
            .andWhere('match.isActive = :isActive', { isActive: true })
            .andWhere('match.chatUnlocked = :chatUnlocked', { chatUnlocked: true })
            .orderBy('match.matchedAt', 'DESC')
            .getMany();

        const conversations: ConversationDto[] = [];

        for (const match of matches) {
            const otherUser = match.user1Id === userId ? match.user2 : match.user1;

            // Get last message
            const lastMessage = await this.messageRepository.findOne({
                where: { matchId: match.id, isDeleted: false },
                order: { createdAt: 'DESC' },
            });

            // Get unread count
            const unreadCount = await this.messageRepository.count({
                where: {
                    matchId: match.id,
                    senderId: otherUser.id, // Messages from other user
                    readAt: IsNull(),
                    isDeleted: false,
                },
            });

            conversations.push({
                matchId: match.id,
                otherUser: {
                    id: otherUser.id,
                    name: otherUser.name,
                    photos: otherUser.profile?.photos,
                    isVerified: otherUser.isVerified,
                },
                lastMessage: lastMessage
                    ? {
                        id: lastMessage.id,
                        content: lastMessage.content,
                        senderId: lastMessage.senderId,
                        createdAt: lastMessage.createdAt,
                        isRead: !!lastMessage.readAt,
                    }
                    : undefined,
                unreadCount,
                chatUnlocked: match.chatUnlocked,
            });
        }

        // Sort by last message time
        conversations.sort((a, b) => {
            const aTime = a.lastMessage?.createdAt || new Date(0);
            const bTime = b.lastMessage?.createdAt || new Date(0);
            return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        return conversations;
    }

    // ==================== MARK AS READ ====================

    async markAsRead(userId: string, matchId: string, lastMessageId?: string): Promise<{ success: boolean; count: number }> {
        // Validate access
        await this.validateChatAccess(userId, matchId);

        // Get other user ID
        const match = await this.matchRepository.findOne({
            where: { id: matchId },
        });

        if (!match) {
            throw new NotFoundException('Match not found');
        }

        const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;

        // Build update query - mark all unread messages from other user as read
        const queryBuilder = this.messageRepository
            .createQueryBuilder()
            .update(Message)
            .set({ readAt: new Date() })
            .where('matchId = :matchId', { matchId })
            .andWhere('senderId = :otherUserId', { otherUserId })
            .andWhere('readAt IS NULL');

        const result = await queryBuilder.execute();

        return {
            success: true,
            count: result.affected || 0,
        };
    }

    // ==================== DELETE MESSAGE ====================

    async deleteMessage(userId: string, messageId: string): Promise<{ success: boolean }> {
        const message = await this.messageRepository.findOne({
            where: { id: messageId },
        });

        if (!message) {
            throw new NotFoundException('Message not found');
        }

        if (message.senderId !== userId) {
            throw new ForbiddenException('Can only delete your own messages');
        }

        message.isDeleted = true;
        await this.messageRepository.save(message);

        return { success: true };
    }

    // ==================== HELPER METHODS ====================

    private async validateChatAccess(userId: string, matchId: string): Promise<Match> {
        const match = await this.matchRepository.findOne({
            where: { id: matchId },
        });

        if (!match) {
            throw new NotFoundException('Match not found');
        }

        // Check if user is part of match
        if (match.user1Id !== userId && match.user2Id !== userId) {
            throw new ForbiddenException('Not authorized to access this chat');
        }

        // Check if match is active
        if (!match.isActive) {
            throw new BadRequestException('This match is no longer active');
        }

        // Check if chat is unlocked
        if (!match.chatUnlocked) {
            throw new ForbiddenException('Chat is locked. Complete the micro-date game first!');
        }

        return match;
    }

    private mapToMessageDto(message: Message, currentUserId: string): MessageDto {
        return {
            id: message.id,
            matchId: message.matchId,
            senderId: message.senderId,
            content: message.content,
            createdAt: message.createdAt,
            readAt: message.readAt ?? undefined,
            isMe: message.senderId === currentUserId,
        };
    }

    // For WebSocket - validate user can join room
    async validateUserForRoom(userId: string, matchId: string): Promise<boolean> {
        try {
            await this.validateChatAccess(userId, matchId);
            return true;
        } catch {
            return false;
        }
    }

    // Get message by ID (for WebSocket)
    async getMessageById(messageId: string): Promise<Message | null> {
        return this.messageRepository.findOne({
            where: { id: messageId },
            relations: ['sender'],
        });
    }
}
