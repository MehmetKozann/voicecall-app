import { apiClient } from './client';
import { Conversation, Message } from '../types/chat.types';
import { PaginatedMessagesResponse } from '../types/api.types';

export const chatApi = {
  async getConversations(): Promise<Conversation[]> {
    const res = await apiClient.get<Conversation[]>('/conversations');
    return res.data;
  },

  async createDirectConversation(participantId: string): Promise<Conversation> {
    const res = await apiClient.post<Conversation>('/conversations', {
      participantId,
      type: 'DIRECT',
    });
    return res.data;
  },

  async createGroupConversation(participantIds: string[], title: string): Promise<Conversation> {
    const res = await apiClient.post<Conversation>('/conversations', {
      participantIds,
      title,
      type: 'GROUP',
    });
    return res.data;
  },

  async getConversation(id: string): Promise<Conversation> {
    const res = await apiClient.get<Conversation>(`/conversations/${id}`);
    return res.data;
  },

  async getMessages(
    conversationId: string,
    cursor?: string,
    limit: number = 30,
  ): Promise<PaginatedMessagesResponse> {
    const res = await apiClient.get<PaginatedMessagesResponse>(
      `/conversations/${conversationId}/messages`,
      {
        params: { cursor, limit },
      },
    );
    return res.data;
  },

  async sendMessage(data: {
    conversationId: string;
    content?: string;
    type?: string;
    attachmentIds?: string[];
  }): Promise<Message> {
    const res = await apiClient.post<Message>('/messages', data);
    return res.data;
  },

  async markAsRead(conversationId: string): Promise<{ success: boolean }> {
    const res = await apiClient.post<{ success: boolean }>(`/conversations/${conversationId}/read`);
    return res.data;
  },
};
