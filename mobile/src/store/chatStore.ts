import { create } from 'zustand';
import { Conversation, Message, MessageType, Attachment } from '../types/chat.types';
import { chatApi } from '../api/chatApi';
import { socketService } from '../services/socket';
import { useAuthStore } from './authStore';

interface ChatState {
  conversations: Conversation[];
  messages: { [conversationId: string]: Message[] };
  activeConversationId: string | null;
  typingUsers: { [conversationId: string]: { [userId: string]: string } };
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;

  // Actions
  fetchConversations: () => Promise<void>;
  createDirectChat: (participantId: string) => Promise<Conversation>;
  setActiveConversation: (id: string | null) => void;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (
    conversationId: string,
    content?: string,
    type?: MessageType,
    attachment?: Attachment,
  ) => Promise<void>;
  markAsRead: (conversationId: string) => void;

  // Real-time Event Handlers
  setupSocketListeners: () => () => void;
  onInboundMessage: (msg: Message) => void;
  onMessageStatusUpdate: (data: {
    messageId?: string;
    conversationId: string;
    status: 'DELIVERED' | 'READ';
    userId: string;
    lastMessageId?: string;
  }) => void;
  onTypingUpdate: (data: {
    conversationId: string;
    userId: string;
    username: string;
    isTyping: boolean;
  }) => void;
  onPresenceUpdate: (data: { userId: string; isOnline: boolean; lastSeen: string }) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: {},
  activeConversationId: null,
  typingUsers: {},
  isLoadingConversations: false,
  isLoadingMessages: false,

  fetchConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const conversations = await chatApi.getConversations();
      set({ conversations, isLoadingConversations: false });
    } catch (err) {
      console.warn('Failed to fetch conversations:', err);
      set({ isLoadingConversations: false });
    }
  },

  createDirectChat: async (participantId: string) => {
    const conv = await chatApi.createDirectConversation(participantId);
    set((state) => {
      const exists = state.conversations.some((c) => c.id === conv.id);
      return {
        conversations: exists ? state.conversations : [conv, ...state.conversations],
      };
    });
    return conv;
  },

  setActiveConversation: (id) => {
    const prevId = get().activeConversationId;
    if (prevId) {
      socketService.leaveConversation(prevId);
    }

    set({ activeConversationId: id });

    if (id) {
      socketService.joinConversation(id);
      get().markAsRead(id);
      get().fetchMessages(id);
    }
  },

  fetchMessages: async (conversationId) => {
    set({ isLoadingMessages: true });
    try {
      const res = await chatApi.getMessages(conversationId);
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: res.messages,
        },
        isLoadingMessages: false,
      }));
    } catch (err) {
      console.warn('Failed to fetch messages:', err);
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: async (conversationId, content, type = 'TEXT', attachment) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Optimistic Message
    const optimisticMessage: Message = {
      id: tempId,
      tempId,
      conversationId,
      senderId: currentUser.id,
      sender: currentUser,
      content: content || null,
      type,
      status: 'PENDING',
      attachments: attachment ? [attachment] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Append optimistically to state
    set((state) => {
      const currentList = state.messages[conversationId] || [];
      return {
        messages: {
          ...state.messages,
          [conversationId]: [optimisticMessage, ...currentList],
        },
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, lastMessage: optimisticMessage, updatedAt: new Date().toISOString() } : c,
        ),
      };
    });

    // Transmit via Socket.IO with fallback to REST
    socketService.sendMessage(
      {
        tempId,
        conversationId,
        content,
        type,
        attachmentIds: attachment ? [attachment.id] : undefined,
      },
      (response) => {
        if (response.success && response.data) {
          const serverMsg = response.data;
          set((state) => {
            const list = (state.messages[conversationId] || []).map((m) =>
              m.id === tempId || m.tempId === tempId ? serverMsg : m,
            );
            return {
              messages: { ...state.messages, [conversationId]: list },
              conversations: state.conversations.map((c) =>
                c.id === conversationId ? { ...c, lastMessage: serverMsg } : c,
              ),
            };
          });
        } else {
          // Mark message as failed
          set((state) => {
            const list = (state.messages[conversationId] || []).map((m) =>
              m.id === tempId ? { ...m, status: 'FAILED' as const } : m,
            );
            return {
              messages: { ...state.messages, [conversationId]: list },
            };
          });
        }
      },
    );
  },

  markAsRead: (conversationId) => {
    socketService.sendRead(conversationId);
    chatApi.markAsRead(conversationId).catch(() => {});

    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((m) =>
          m.status !== 'READ' ? { ...m, status: 'READ' as const } : m,
        ),
      },
    }));
  },

  onInboundMessage: (msg) => {
    const activeId = get().activeConversationId;
    const currentUserId = useAuthStore.getState().user?.id;

    // If message is from someone else, send delivery receipt
    if (msg.senderId !== currentUserId) {
      socketService.sendDelivered(msg.id, msg.conversationId);
      if (activeId === msg.conversationId) {
        socketService.sendRead(msg.conversationId, msg.id);
      }
    }

    set((state) => {
      const convMessages = state.messages[msg.conversationId] || [];
      const alreadyExists = convMessages.some((m) => m.id === msg.id || (m.tempId && m.tempId === msg.tempId));

      const updatedMessages = alreadyExists
        ? convMessages.map((m) => (m.id === msg.id || m.tempId === msg.tempId ? msg : m))
        : [msg, ...convMessages];

      const updatedConversations = state.conversations.map((c) => {
        if (c.id === msg.conversationId) {
          const isCurrentActive = activeId === msg.conversationId;
          return {
            ...c,
            lastMessage: msg,
            updatedAt: msg.createdAt,
            unreadCount: isCurrentActive || msg.senderId === currentUserId ? c.unreadCount : c.unreadCount + 1,
          };
        }
        return c;
      });

      return {
        messages: {
          ...state.messages,
          [msg.conversationId]: updatedMessages,
        },
        conversations: updatedConversations,
      };
    });
  },

  onMessageStatusUpdate: (data) => {
    set((state) => {
      const convMessages = state.messages[data.conversationId];
      if (!convMessages) return state;

      const updated = convMessages.map((m) => {
        if (data.messageId && m.id === data.messageId) {
          return { ...m, status: data.status };
        }
        if (data.status === 'READ') {
          return { ...m, status: 'READ' as const };
        }
        return m;
      });

      return {
        messages: {
          ...state.messages,
          [data.conversationId]: updated,
        },
      };
    });
  },

  onTypingUpdate: (data) => {
    set((state) => {
      const current = state.typingUsers[data.conversationId] || {};
      const updated = { ...current };

      if (data.isTyping) {
        updated[data.userId] = data.username;
      } else {
        delete updated[data.userId];
      }

      return {
        typingUsers: {
          ...state.typingUsers,
          [data.conversationId]: updated,
        },
      };
    });
  },

  onPresenceUpdate: (data) => {
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.otherMember?.id === data.userId) {
          return {
            ...c,
            otherMember: {
              ...c.otherMember,
              isOnline: data.isOnline,
              lastSeen: data.lastSeen,
            },
          };
        }
        return c;
      }),
    }));
  },

  setupSocketListeners: () => {
    const unsubNewMessage = socketService.onNewMessage((msg) => get().onInboundMessage(msg));
    const unsubStatus = socketService.onMessageStatus((data) => get().onMessageStatusUpdate(data));
    const unsubTyping = socketService.onTypingUpdate((data) => get().onTypingUpdate(data));
    const unsubPresence = socketService.onPresenceUpdate((data) => get().onPresenceUpdate(data));

    return () => {
      unsubNewMessage();
      unsubStatus();
      unsubTyping();
      unsubPresence();
    };
  },
}));
