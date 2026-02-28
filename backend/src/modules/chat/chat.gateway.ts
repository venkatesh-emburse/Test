import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { NotificationService } from '../notification/notification.service';
import { WsMessage, WsTypingEvent } from './dto';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure properly in production
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track connected users: userId -> socketId
  private connectedUsers: Map<string, string> = new Map();

  constructor(
    private chatService: ChatService,
    private notificationService: NotificationService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ==================== CONNECTION ====================

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        console.log(`❌ Client ${client.id} disconnected: No token`);
        client.disconnect();
        return;
      }

      // Verify JWT
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('jwt.secret'),
      });

      client.userId = payload.sub;
      client.userName = payload.name || 'User';

      // Track connection
      this.connectedUsers.set(payload.sub, client.id);

      console.log(`✅ User ${client.userId} connected (socket: ${client.id})`);

      // Notify client of successful connection
      client.emit('connected', { userId: client.userId });
    } catch (error) {
      console.log(`❌ Client ${client.id} auth failed:`, error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      console.log(`👋 User ${client.userId} disconnected`);
    }
  }

  // ==================== JOIN ROOM ====================

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    // Validate user can access this match
    const canAccess = await this.chatService.validateUserForRoom(
      client.userId,
      data.matchId,
    );

    if (!canAccess) {
      return { error: 'Cannot access this chat' };
    }

    // Join the room
    client.join(`match:${data.matchId}`);
    console.log(`📫 User ${client.userId} joined room match:${data.matchId}`);

    return { success: true, room: data.matchId };
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    client.leave(`match:${data.matchId}`);
    console.log(`📭 User ${client.userId} left room match:${data.matchId}`);
    return { success: true };
  }

  // ==================== SEND MESSAGE ====================

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string; content: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      // Save message via service
      const message = await this.chatService.sendMessage(client.userId, {
        matchId: data.matchId,
        content: data.content,
      });

      // Broadcast to room (including sender for confirmation)
      this.server.to(`match:${data.matchId}`).emit('new_message', {
        id: message.id,
        matchId: message.matchId,
        senderId: message.senderId,
        senderName: client.userName,
        content: message.content,
        createdAt: message.createdAt,
        warningType: message.warningType || null,
      });

      // Send push notification to the other user (non-blocking)
      this.sendPushForMessage(
        client.userId,
        client.userName || 'Someone',
        data.matchId,
        data.content,
      ).catch((err) =>
        console.error('❌ Push notification error:', err.message),
      );

      return { success: true, messageId: message.id };
    } catch (error) {
      return { error: error.message };
    }
  }

  // ==================== TYPING INDICATOR ====================

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string; isTyping: boolean },
  ) {
    if (!client.userId) return;

    // Broadcast to room (except sender)
    client.to(`match:${data.matchId}`).emit('user_typing', {
      matchId: data.matchId,
      userId: client.userId,
      userName: client.userName,
      isTyping: data.isTyping,
    } as WsTypingEvent);
  }

  // ==================== READ RECEIPT ====================

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string; messageId?: string },
  ) {
    if (!client.userId) return;

    try {
      await this.chatService.markAsRead(
        client.userId,
        data.matchId,
        data.messageId,
      );

      // Notify other user in room
      client.to(`match:${data.matchId}`).emit('messages_read', {
        matchId: data.matchId,
        userId: client.userId,
        readAt: new Date(),
      });

      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  // ==================== UTILITIES ====================

  // Send notification to specific user (if online)
  sendToUser(userId: string, event: string, data: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Look up the other user in the match and send them a push notification.
   */
  private async sendPushForMessage(
    senderId: string,
    senderName: string,
    matchId: string,
    content: string,
  ) {
    try {
      // Find the recipient (the other user in the match)
      const match = await this.chatService.getMatchById(matchId);
      if (!match) return;

      const recipientId =
        match.user1Id === senderId ? match.user2Id : match.user1Id;

      // Always send push — even if the recipient is "online" via socket,
      // they might have the app in the background or on a different screen.
      await this.notificationService.sendChatNotification(
        recipientId,
        senderName,
        content,
        matchId,
      );
    } catch (err) {
      console.error('❌ sendPushForMessage error:', err.message);
    }
  }
}
