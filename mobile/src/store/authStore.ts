import { create } from 'zustand';
import { User } from '../types/user.types';
import { StorageService } from '../services/storage';
import { authApi } from '../api/authApi';
import { userApi } from '../api/userApi';
import { socketService } from '../services/socket';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  quickLogin: (username: string) => Promise<boolean>;
  login: (identifier: string, password: string) => Promise<boolean>;
  register: (email: string, username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (data: { username?: string; avatarUrl?: string }) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const accessToken = await StorageService.getAccessToken();
      if (!accessToken) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const user = await userApi.getMe();
      set({ user, isAuthenticated: true, isLoading: false });

      // Connect socket after auth restored
      await socketService.connect();
    } catch (err: any) {
      await StorageService.clearAll();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  quickLogin: async (username) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.quickLogin(username);
      await StorageService.saveTokens(res.tokens.accessToken, res.tokens.refreshToken);
      set({ user: res.user, isAuthenticated: true, isLoading: false, error: null });

      // Connect socket in background without blocking navigation
      socketService.connect().catch((sErr) => {
        console.warn('Socket connect in background error:', sErr);
      });
      return true;
    } catch (err: any) {
      console.warn('Quick login error:', err);
      let message = err.response?.data?.message;
      if (!message) {
        if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          message = 'Sunucu uyanıyor, lütfen 10 saniye sonra tekrar deneyin.';
        } else if (err.message === 'Network Error') {
          message = 'İnternet bağlantınızı veya sunucu erişimini kontrol edin.';
        } else {
          message = err.message || 'Giriş yapılamadı.';
        }
      }
      set({
        error: Array.isArray(message) ? message.join(', ') : message,
        isLoading: false,
      });
      return false;
    }
  },

  login: async (identifier, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login({ identifier, password });
      await StorageService.saveTokens(res.tokens.accessToken, res.tokens.refreshToken);
      set({ user: res.user, isAuthenticated: true, isLoading: false });

      await socketService.connect();
      return true;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed. Please check credentials.';
      set({
        error: Array.isArray(message) ? message.join(', ') : message,
        isLoading: false,
      });
      return false;
    }
  },

  register: async (email, username, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.register({ email, username, password });
      await StorageService.saveTokens(res.tokens.accessToken, res.tokens.refreshToken);
      set({ user: res.user, isAuthenticated: true, isLoading: false });

      await socketService.connect();
      return true;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Registration failed.';
      set({
        error: Array.isArray(message) ? message.join(', ') : message,
        isLoading: false,
      });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      const refreshToken = await StorageService.getRefreshToken();
      if (refreshToken) {
        await authApi.logout(refreshToken).catch(() => {});
      }
    } finally {
      await StorageService.clearAll();
      socketService.disconnect();
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  updateUser: async (data) => {
    try {
      const updated = await userApi.updateMe(data);
      set({ user: updated });
    } catch (err: any) {
      const message = err.response?.data?.message || 'Update failed.';
      set({ error: Array.isArray(message) ? message.join(', ') : message });
    }
  },

  clearError: () => set({ error: null }),
}));
