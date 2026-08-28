import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../api/client';
import { StorageService } from './storage';
import { Message, MessageType } from '../types/chat.types';

class SocketService {
  private socket: Socket | null = null;
  private isConnecting: boolean = false;

  /**
   * Connect to Socket.IO gateway with authentication
   */
  async connect(): Promise<Socket | null> {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.isConnecting) return null;
    this.isConnecting = true;

    const token = await StorageService.getAccessToken();
    if (!token) {
      this.isConnecting = false;
      return null;
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token: `Bearer ${token}`,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('⚡ Socket.IO Connected successfully');
      this.isConnecting = false;
    });

    this.socket.on('connect_error', (err) => {
      console.warn('Socket connect error:', err.message);
      this.isConnecting = false;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnecting = false;
    });

    return this.socket;
  }

  /**
   * Disconnect socket on logout
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
    }
  }

  /**
   * Join conversation room
   */
  joinConversation(conversationId: string) {
    this.socket?.emit('conversation:join', { conversationId });
  }

  /**
   * Leave conversation room
   */
  leaveConversation(conversationId: string) {
    this.socket?.emit('conversation:leave', { conversationId });
  }

  /**
   * Send real-time message via socket
   */
  sendMessage(
    payload: {
      tempId: string;
      conversationId: string;
      content?: string;
      type: MessageType;
      attachmentIds?: string[];
    },
    callback?: (response: { success: boolean; data?: Message; error?: string }) => void,
  ) {
    this.socket?.emit('message:send', payload, callback);
  }

  /**
   * Send typing status
   */
  sendTypingStart(conversationId: string) {
    this.socket?.emit('typing:start', { conversationId });
  }

  sendTypingStop(conversationId: string) {
    this.socket?.emit('typing:stop', { conversationId });
  }

  /**
   * Send delivery receipt
   */
  sendDelivered(messageId: string, conversationId: string) {
    this.socket?.emit('message:delivered', { messageId, conversationId });
  }

  /**
   * Send read receipt
   */
  sendRead(conversationId: string, lastMessageId?: string) {
    this.socket?.emit('message:read', { conversationId, lastMessageId });
  }

  /**
   * Event Listeners
   */
  onNewMessage(listener: (message: Message) => void) {
    this.socket?.on('message:new', listener);
    return () => {
      this.socket?.off('message:new', listener);
    };
  }

  onMessageStatus(
    listener: (data: {
      messageId?: string;
      conversationId: string;
      status: 'DELIVERED' | 'READ';
      userId: string;
      lastMessageId?: string;
    }) => void,
  ) {
    this.socket?.on('message:status', listener);
    return () => {
      this.socket?.off('message:status', listener);
    };
  }

  onTypingUpdate(
    listener: (data: {
      conversationId: string;
      userId: string;
      username: string;
      isTyping: boolean;
    }) => void,
  ) {
    this.socket?.on('typing:update', listener);
    return () => {
      this.socket?.off('typing:update', listener);
    };
  }

  onPresenceUpdate(
    listener: (data: { userId: string; isOnline: boolean; lastSeen: string }) => void,
  ) {
    this.socket?.on('presence:update', listener);
    return () => {
      this.socket?.off('presence:update', listener);
    };
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();

