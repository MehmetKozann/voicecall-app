import { apiClient } from './client';
import { User } from '../types/user.types';

export const userApi = {
  async getMe(): Promise<User> {
    const res = await apiClient.get<User>('/users/me');
    return res.data;
  },

  async updateMe(data: { username?: string; avatarUrl?: string }): Promise<User> {
    const res = await apiClient.patch<User>('/users/me', data);
    return res.data;
  },

  async searchUsers(query: string): Promise<User[]> {
    const res = await apiClient.get<User[]>('/users/search', {
      params: { q: query },
    });
    return res.data;
  },
};
