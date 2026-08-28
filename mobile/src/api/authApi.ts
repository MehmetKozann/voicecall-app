import { apiClient } from './client';
import { AuthResponse, AuthTokens } from '../types/user.types';

export const authApi = {
  async quickLogin(username: string): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/quick-login', { username });
    return res.data;
  },

  async register(data: { email: string; username: string; password: string }): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/register', data);
    return res.data;
  },

  async login(data: { identifier: string; password: string }): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/login', data);
    return res.data;
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const res = await apiClient.post<AuthTokens>('/auth/refresh', { refreshToken });
    return res.data;
  },

  async logout(refreshToken: string): Promise<{ success: boolean }> {
    const res = await apiClient.post<{ success: boolean }>('/auth/logout', { refreshToken });
    return res.data;
  },
};
