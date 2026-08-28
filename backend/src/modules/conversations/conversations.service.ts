import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConversationType, MemberRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import {
  ConversationDetailDto,
  ConversationSummaryDto,
  ConversationMemberDto,
} from './dto/conversation-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { MessageResponseDto } from '../messages/dto/message-response.dto';

@Injectable()
export class ConversationsService {
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

  private mapMember(member: any): ConversationMemberDto {
    return {
      id: member.id,
      userId: member.userId,
      user: this.mapUser(member.user),
      role: member.role,
      joinedAt: member.joinedAt,
      lastReadAt: member.lastReadAt,
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
   * Check if a user is a member of the conversation
   */
  async isUserMember(conversationId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    return !!membership;
  }

  /**
   * Create or return existing direct conversation or create a group conversation
   */
  async createConversation(
    currentUserId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationDetailDto> {
    const type = dto.type || ConversationType.DIRECT;

    if (type === ConversationType.DIRECT) {
      if (!dto.participantId) {
        throw new BadRequestException('participantId is required for direct conversations');
      }

      if (dto.participantId === currentUserId) {
        throw new BadRequestException('Cannot create a direct conversation with yourself');
      }

      // Check if target user exists
      const targetUser = await this.prisma.user.findUnique({
        where: { id: dto.participantId },
      });
      if (!targetUser) {
        throw new NotFoundException('Participant user not found');
      }

      // Look for existing direct conversation between both users
      const existing = await this.prisma.conversation.findFirst({
        where: {
          type: ConversationType.DIRECT,
          AND: [
            { members: { some: { userId: currentUserId } } },
            { members: { some: { userId: dto.participantId } } },
          ],
        },
        include: {
          members: {
            include: { user: true },
          },
        },
      });

      if (existing) {
        return {
          id: existing.id,
          type: existing.type,
          title: existing.title,
          avatarUrl: existing.avatarUrl,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
          members: existing.members.map((m) => this.mapMember(m)),
        };
      }

      // Create new direct conversation
      const conversation = await this.prisma.conversation.create({
        data: {
          type: ConversationType.DIRECT,
          members: {
            create: [
              { userId: currentUserId, role: MemberRole.ADMIN },
              { userId: dto.participantId, role: MemberRole.MEMBER },
            ],
          },
        },
        include: {
          members: {
            include: { user: true },
          },
        },
      });

      return {
        id: conversation.id,
        type: conversation.type,
        title: conversation.title,
        avatarUrl: conversation.avatarUrl,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        members: conversation.members.map((m) => this.mapMember(m)),
      };
    } else {
      // Group conversation
      const participantIds = Array.from(
        new Set([currentUserId, ...(dto.participantIds || [])]),
      );

      if (participantIds.length < 2) {
        throw new BadRequestException('A group must have at least 2 participants');
      }

      const conversation = await this.prisma.conversation.create({
        data: {
          type: ConversationType.GROUP,
          title: dto.title || 'New Group',
          members: {
            create: participantIds.map((userId) => ({
              userId,
              role: userId === currentUserId ? MemberRole.ADMIN : MemberRole.MEMBER,
            })),
          },
        },
        include: {
          members: {
            include: { user: true },
          },
        },
      });

      return {
        id: conversation.id,
        type: conversation.type,
        title: conversation.title,
        avatarUrl: conversation.avatarUrl,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        members: conversation.members.map((m) => this.mapMember(m)),
      };
    }
  }

  /**
   * Get all conversations the user is a part of
   */
  async getUserConversations(userId: string): Promise<ConversationSummaryDto[]> {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true, lastReadAt: true },
    });

    const conversationIds = memberships.map((m) => m.conversationId);
    const lastReadMap = new Map<string, Date | null>(
      memberships.map((m) => [m.conversationId, m.lastReadAt]),
    );

    const conversations = await this.prisma.conversation.findMany({
      where: { id: { in: conversationIds } },
      include: {
        members: {
          include: { user: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: true,
            attachments: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Calculate unread counts
    const result: ConversationSummaryDto[] = [];

    for (const conv of conversations) {
      const userLastRead = lastReadMap.get(conv.id);

      const unreadCount = await this.prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: userId },
          createdAt: userLastRead ? { gt: userLastRead } : undefined,
        },
      });

      const members = conv.members.map((m) => this.mapMember(m));
      const otherMember =
        conv.type === ConversationType.DIRECT
          ? members.find((m) => m.userId !== userId)?.user || null
          : null;

      const lastMessage = conv.messages[0] ? this.mapMessage(conv.messages[0]) : null;

      result.push({
        id: conv.id,
        type: conv.type,
        title: conv.title,
        avatarUrl: conv.avatarUrl,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        members,
        otherMember,
        lastMessage,
        unreadCount,
      });
    }

    return result;
  }

  /**
   * Get conversation details by ID
   */
  async getConversationById(
    conversationId: string,
    userId: string,
  ): Promise<ConversationDetailDto> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          include: { user: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isMember = conversation.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this conversation');
    }

    return {
      id: conversation.id,
      type: conversation.type,
      title: conversation.title,
      avatarUrl: conversation.avatarUrl,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      members: conversation.members.map((m) => this.mapMember(m)),
    };
  }

  /**
   * Mark conversation messages as read for a user
   */
  async markAsRead(conversationId: string, userId: string, lastMessageId?: string) {
    const now = new Date();

    await this.prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadAt: now,
      },
    });

    // Update unread incoming messages status to READ
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { not: 'READ' },
      },
      data: {
        status: 'READ',
      },
    });

    return { success: true, timestamp: now };
  }
}
