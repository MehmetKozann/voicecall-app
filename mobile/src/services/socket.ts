import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../api/client';
import { StorageService } from './storage';
import { Message, MessageType } from '../types/chat.types';
import { useCallStore } from '../store/callStore';
import { webrtcService } from './webrtcService';

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
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Wire up call signaling immediately
    this.setupCallSignaling(this.socket);

    this.socket.on('connect', () => {
      console.log('⚡ Socket.IO Connected successfully');
      this.isConnecting = false;
      if (this.socket) {
        this.setupCallSignaling(this.socket);
      }
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
   * Setup voice call signaling handlers on active socket
   */
  private setupCallSignaling(socket: Socket) {
    socket.off('call:incoming');
    socket.off('call:accepted');
    socket.off('call:rejected');
    socket.off('call:ended');
    socket.off('call:signal');

    socket.on('call:incoming', (data: any) => {
      console.log('📞 Received call:incoming event:', data);
      useCallStore.getState().incomingCall({
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        conversationId: data.conversationId,
      });
    });

    socket.on('call:accepted', (data: any) => {
      console.log('✅ Received call:accepted event:', data);
      useCallStore.setState({ status: 'CONNECTED', duration: 0 });
    });

    socket.on('call:rejected', (data: any) => {
      console.log('❌ Received call:rejected event:', data);
      webrtcService.closeConnection();
      useCallStore.setState({ status: 'ENDED' });
      setTimeout(() => useCallStore.getState().resetCall(), 1200);
    });

    socket.on('call:ended', (data: any) => {
      console.log('🛑 Received call:ended event:', data);
      webrtcService.closeConnection();
      useCallStore.setState({ status: 'ENDED' });
      setTimeout(() => useCallStore.getState().resetCall(), 1200);
    });

    socket.on('call:signal', async (data: { senderId: string; signal: any; type: string }) => {
      console.log('📶 Received call:signal event:', data.type);
      if (data.type === 'offer') {
        useCallStore.getState().setPendingOffer(data.signal);
        if (useCallStore.getState().status === 'CONNECTED') {
          await webrtcService.handleOffer(data.senderId, data.signal);
        }
      } else if (data.type === 'answer') {
        await webrtcService.handleAnswer(data.signal);
      } else if (data.type === 'candidate') {
        await webrtcService.handleCandidate(data.signal);
      }
    });
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
