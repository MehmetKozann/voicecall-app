import { User } from './user.types';

export type ConversationType = 'DIRECT' | 'GROUP';
export type MemberRole = 'ADMIN' | 'MEMBER';
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'VOICE';
export type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface Attachment {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  duration?: number | null;
  createdAt: string;
}

export interface Message {
  id: string;
  tempId?: string;
  conversationId: string;
  senderId: string;
  sender: User;
  content: string | null;
  type: MessageType;
  status: MessageStatus;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMember {
  id: string;
  userId: string;
  user: User;
  role: MemberRole;
  joinedAt: string;
  lastReadAt: string | null;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  members: ConversationMember[];
  otherMember?: User | null;
  lastMessage?: Message | null;
  unreadCount: number;
}
