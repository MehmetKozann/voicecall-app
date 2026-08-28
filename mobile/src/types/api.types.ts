import { Message } from './chat.types';

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedMessagesResponse {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}
