import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Send Message DTO
export class SendMessageDto {
    @ApiProperty({ description: 'Match ID to send message to' })
    @IsString()
    @IsNotEmpty()
    @IsUUID()
    matchId: string;

    @ApiProperty({ description: 'Message content' })
    @IsString()
    @IsNotEmpty()
    content: string;
}

// Get Messages Query DTO
export class GetMessagesQueryDto {
    @ApiPropertyOptional({ example: 20, description: 'Number of messages to fetch' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    limit?: number;

    @ApiPropertyOptional({ description: 'Cursor for pagination (message ID)' })
    @IsOptional()
    @IsString()
    before?: string;
}

// Mark Read DTO
export class MarkReadDto {
    @ApiProperty({ description: 'Match ID' })
    @IsString()
    @IsNotEmpty()
    @IsUUID()
    matchId: string;

    @ApiPropertyOptional({ description: 'Last read message ID' })
    @IsOptional()
    @IsString()
    lastMessageId?: string;
}

// Response DTOs
export class MessageDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    matchId: string;

    @ApiProperty()
    senderId: string;

    @ApiProperty()
    content: string;

    @ApiProperty()
    createdAt: Date;

    @ApiPropertyOptional()
    readAt?: Date;

    @ApiProperty()
    isMe: boolean;
}

export class ConversationDto {
    @ApiProperty()
    matchId: string;

    @ApiProperty()
    otherUser: {
        id: string;
        name: string;
        photos?: string[];
        isVerified: boolean;
    };

    @ApiPropertyOptional()
    lastMessage?: {
        id: string;
        content: string;
        senderId: string;
        createdAt: Date;
        isRead: boolean;
    };

    @ApiProperty()
    unreadCount: number;

    @ApiProperty()
    chatUnlocked: boolean;
}

// WebSocket Events
export interface WsMessage {
    matchId: string;
    content: string;
}

export interface WsMessageResponse {
    id: string;
    matchId: string;
    senderId: string;
    senderName: string;
    content: string;
    createdAt: Date;
}

export interface WsTypingEvent {
    matchId: string;
    userId: string;
    userName: string;
    isTyping: boolean;
}

export interface WsReadReceiptEvent {
    matchId: string;
    userId: string;
    messageId: string;
    readAt: Date;
}
