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
import { ChatService } from './chat.service';
import { NotificationService } from '../notification/notification.service';
import { SendMessageDto, GetMessagesQueryDto, MarkReadDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly notificationService: NotificationService,
  ) {}

  // ==================== CONVERSATIONS ====================

  @Get('conversations')
  @ApiOperation({
    summary: 'Get all conversations (matches with unlocked chat)',
  })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  async getConversations(@CurrentUser('id') userId: string) {
    return this.chatService.getConversations(userId);
  }

  // ==================== MESSAGES ====================

  @Get(':matchId/messages')
  @ApiOperation({ summary: 'Get messages for a match' })
  @ApiResponse({ status: 200, description: 'List of messages' })
  @ApiResponse({ status: 403, description: 'Chat locked or not authorized' })
  async getMessages(
    @CurrentUser('id') userId: string,
    @Param('matchId') matchId: string,
    @Query() query: GetMessagesQueryDto,
  ) {
    return this.chatService.getMessages(userId, matchId, query);
  }

  @Post('send')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message (REST fallback for WebSocket)' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @ApiResponse({ status: 403, description: 'Chat locked or not authorized' })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    const message = await this.chatService.sendMessage(userId, dto);

    // Send push notification to the other user (non-blocking)
    const match = await this.chatService.getMatchById(dto.matchId);
    if (match) {
      const recipientId =
        match.user1Id === userId ? match.user2Id : match.user1Id;
      this.notificationService
        .sendChatNotification(recipientId, 'Someone', dto.content, dto.matchId)
        .catch((err) =>
          console.error('❌ REST push notification error:', err.message),
        );
    }

    return {
      success: true,
      message: {
        id: message.id,
        matchId: message.matchId,
        content: message.content,
        createdAt: message.createdAt,
      },
    };
  }

  // ==================== READ RECEIPTS ====================

  @Post('read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark messages as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Body() dto: MarkReadDto,
  ) {
    return this.chatService.markAsRead(userId, dto.matchId, dto.lastMessageId);
  }

  // ==================== DELETE ====================

  @Delete('message/:messageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a message (soft delete)' })
  @ApiResponse({ status: 200, description: 'Message deleted' })
  @ApiResponse({ status: 403, description: 'Can only delete own messages' })
  async deleteMessage(
    @CurrentUser('id') userId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.chatService.deleteMessage(userId, messageId);
  }
}
