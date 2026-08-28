import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessageType, MessageStatus } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: string;
      email: string;
      username: string;
      avatarUrl: string | null;
    };
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private messagesService: MessagesService,
    private conversationsService: ConversationsService,
  ) {}

  /**
   * Handle incoming socket connection with JWT verification
   */
  async handleConnection(client: Socket) {
    try {
      const authHeader =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization ||
        client.handshake.query?.token;

      if (!authHeader) {
        this.logger.warn(`Unauthorized socket connection attempt: ${client.id}`);
        client.disconnect(true);
        return;
      }

      const token = (authHeader as string).replace('Bearer ', '').trim();
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.accessSecret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          username: true,
          avatarUrl: true,
        },
      });

      if (!user) {
        client.disconnect(true);
        return;
      }

      client.data.user = user;

      // Join user's individual room for direct notifications
      client.join(`user_${user.id}`);

      // Set user online in database
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true },
      });

      // Broadcast presence update
      this.server.emit('presence:update', {
        userId: user.id,
        isOnline: true,
        lastSeen: new Date().toISOString(),
      });

      this.logger.log(`Client connected: ${user.username} (${client.id})`);
    } catch (err) {
      this.logger.warn(`Socket connection error: ${err.message}`);
      client.disconnect(true);
    }
  }

  /**
   * Handle socket disconnection
   */
  async handleDisconnect(client: Socket) {
    const user = client.data?.user;
    if (user?.id) {
      // Check if user has other open sockets
      const userSockets = await this.server.in(`user_${user.id}`).fetchSockets();
      if (userSockets.length <= 1) {
        const now = new Date();
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isOnline: false, lastSeen: now },
        });

        this.server.emit('presence:update', {
          userId: user.id,
          isOnline: false,
          lastSeen: now.toISOString(),
        });
      }

      this.logger.log(`Client disconnected: ${user.username} (${client.id})`);
    }
  }

  /**
   * Join a conversation room
   */
  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.user?.id;
    if (!userId || !data?.conversationId) return;

    const isMember = await this.conversationsService.isUserMember(
      data.conversationId,
      userId,
    );

    if (isMember) {
      client.join(`conv_${data.conversationId}`);
    }
  }

  /**
   * Leave a conversation room
   */
  @SubscribeMessage('conversation:leave')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data?.conversationId) {
      client.leave(`conv_${data.conversationId}`);
    }
  }

  /**
   * Send real-time message
   */
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: {
      tempId?: string;
      conversationId: string;
      content?: string;
      type?: MessageType;
      attachmentIds?: string[];
    },
  ) {
    const sender = client.data.user;
    if (!sender?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    try {
      const message = await this.messagesService.createMessage(sender.id, {
        conversationId: payload.conversationId,
        content: payload.content,
        type: payload.type || MessageType.TEXT,
        attachmentIds: payload.attachmentIds,
      });

      const messagePayload = {
        ...message,
        tempId: payload.tempId,
      };

      // Emit to active conversation room
      this.server
        .to(`conv_${payload.conversationId}`)
        .emit('message:new', messagePayload);

      // Also emit to all members' personal rooms to update conversation list previews
      const conv = await this.prisma.conversation.findUnique({
        where: { id: payload.conversationId },
        include: { members: true },
      });

      if (conv) {
        for (const member of conv.members) {
          if (member.userId !== sender.id) {
            this.server.to(`user_${member.userId}`).emit('message:new', messagePayload);
          }
        }
      }

      return { success: true, data: messagePayload };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Typing indicators
   */
  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const user = client.data.user;
    if (!user?.id || !data?.conversationId) return;

    client.to(`conv_${data.conversationId}`).emit('typing:update', {
      conversationId: data.conversationId,
      userId: user.id,
      username: user.username,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const user = client.data.user;
    if (!user?.id || !data?.conversationId) return;

    client.to(`conv_${data.conversationId}`).emit('typing:update', {
      conversationId: data.conversationId,
      userId: user.id,
      username: user.username,
      isTyping: false,
    });
  }

  /**
   * Message delivery receipt
   */
  @SubscribeMessage('message:delivered')
  async handleMessageDelivered(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; conversationId: string },
  ) {
    const userId = client.data.user?.id;
    if (!userId || !data?.messageId) return;

    try {
      const updated = await this.messagesService.updateMessageStatus(
        data.messageId,
        MessageStatus.DELIVERED,
      );

      this.server
        .to(`conv_${data.conversationId}`)
        .emit('message:status', {
          messageId: data.messageId,
          conversationId: data.conversationId,
          status: 'DELIVERED',
          userId,
        });
    } catch (err) {
      // Ignored if message already in higher status
    }
  }

  /**
   * Read receipt
   */
  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; lastMessageId?: string },
  ) {
    const userId = client.data.user?.id;
    if (!userId || !data?.conversationId) return;

    try {
      await this.conversationsService.markAsRead(
        data.conversationId,
        userId,
        data.lastMessageId,
      );

      this.server.to(`conv_${data.conversationId}`).emit('message:status', {
        conversationId: data.conversationId,
        status: 'READ',
        userId,
        lastMessageId: data.lastMessageId,
      });
    } catch (err) {
      this.logger.error(`Error marking message read: ${err.message}`);
    }
  }

  // ==========================================
  // REAL-TIME VOICE CALL SIGNALING
  // ==========================================

  @SubscribeMessage('call:initiate')
  async handleCallInitiate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      recipientId: string;
      conversationId: string;
      isVideo?: boolean;
    },
  ) {
    const caller = client.data.user;
    if (!caller?.id || !data.recipientId) return;

    this.logger.log(`Call initiated by ${caller.username} (${caller.id}) to ${data.recipientId}`);

    this.server.to(`user_${data.recipientId}`).emit('call:incoming', {
      callerId: caller.id,
      callerName: caller.username,
      callerAvatar: caller.avatarUrl,
      conversationId: data.conversationId,
      isVideo: !!data.isVideo,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('call:accept')
  async handleCallAccept(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      callerId: string;
      conversationId: string;
    },
  ) {
    const recipient = client.data.user;
    if (!recipient?.id || !data.callerId) return;

    this.logger.log(`Call accepted by ${recipient.username} from caller ${data.callerId}`);

    this.server.to(`user_${data.callerId}`).emit('call:accepted', {
      recipientId: recipient.id,
      recipientName: recipient.username,
      conversationId: data.conversationId,
    });
  }

  @SubscribeMessage('call:reject')
  async handleCallReject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      callerId: string;
      conversationId?: string;
      reason?: string;
    },
  ) {
    const recipient = client.data.user;
    if (!recipient?.id || !data.callerId) return;

    this.logger.log(`Call rejected by ${recipient.username}`);

    this.server.to(`user_${data.callerId}`).emit('call:rejected', {
      recipientId: recipient.id,
      reason: data.reason || 'declined',
    });
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      peerId: string;
      conversationId?: string;
      duration?: number;
    },
  ) {
    const user = client.data.user;
    if (!user?.id || !data.peerId) return;

    this.logger.log(`Call ended between ${user.id} and ${data.peerId}`);

    this.server.to(`user_${data.peerId}`).emit('call:ended', {
      endedBy: user.id,
      duration: data.duration || 0,
    });
  }

  @SubscribeMessage('call:signal')
  async handleCallSignal(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      recipientId: string;
      signal: any;
      type?: string;
    },
  ) {
    const sender = client.data.user;
    if (!sender?.id || !data.recipientId) return;

    this.server.to(`user_${data.recipientId}`).emit('call:signal', {
      senderId: sender.id,
      signal: data.signal,
      type: data.type,
    });
  }
}

