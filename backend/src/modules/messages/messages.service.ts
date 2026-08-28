import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { MessageStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageResponseDto, MessageListResponseDto } from './dto/message-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  private mapUser(user: any): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private mapMessage(message: any): MessageResponseDto {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      sender: this.mapUser(message.sender),
      content: message.content,
      type: message.type,
      status: message.status,
      attachments: (message.attachments || []).map((att: any) => ({
        id: att.id,
        url: att.url,
        fileName: att.fileName,
        mimeType: att.mimeType,
        fileSize: att.fileSize,
        duration: att.duration,
        createdAt: att.createdAt,
      })),
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  /**
   * Create and persist a message
   */
  async createMessage(senderId: string, dto: SendMessageDto): Promise<MessageResponseDto> {
    // Verify sender is a conversation member
    const membership = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: dto.conversationId,
          userId: senderId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this conversation');
    }

    if (!dto.content && (!dto.attachmentIds || dto.attachmentIds.length === 0)) {
      throw new BadRequestException('Message must have content or attachments');
    }

    // Create message inside a transaction and update conversation updatedAt
    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId: dto.conversationId,
          senderId,
          content: dto.content,
          type: dto.type || 'TEXT',
          status: MessageStatus.SENT,
        },
        include: {
          sender: true,
          attachments: true,
        },
      });

      // If attachments were uploaded separately, link them
      if (dto.attachmentIds && dto.attachmentIds.length > 0) {
        await tx.attachment.updateMany({
          where: { id: { in: dto.attachmentIds } },
          data: { messageId: created.id },
        });
      }

      await tx.conversation.update({
        where: { id: dto.conversationId },
        data: { updatedAt: new Date() },
      });

      return tx.message.findUnique({
        where: { id: created.id },
        include: {
          sender: true,
          attachments: true,
        },
      });
    });

    return this.mapMessage(message);
  }

  /**
   * Get messages with cursor-based pagination
   */
  async getConversationMessages(
    conversationId: string,
    userId: string,
    cursor?: string,
    limit: number = 30,
  ): Promise<MessageListResponseDto> {
    // Verify membership
    const membership = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this conversation');
    }

    const takeLimit = Math.min(Math.max(limit, 1), 100);

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      take: takeLimit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: true,
        attachments: true,
      },
    });

    let nextCursor: string | null = null;
    let hasMore = false;

    if (messages.length > takeLimit) {
      const nextItem = messages.pop();
      nextCursor = nextItem ? nextItem.id : null;
      hasMore = true;
    }

    return {
      messages: messages.map((m) => this.mapMessage(m)),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Update message status
   */
  async updateMessageStatus(
    messageId: string,
    status: MessageStatus,
  ): Promise<MessageResponseDto> {
    const message = await this.prisma.message.update({
      where: { id: messageId },
      data: { status },
      include: {
        sender: true,
        attachments: true,
      },
    });

    return this.mapMessage(message);
  }
}
