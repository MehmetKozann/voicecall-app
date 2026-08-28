import { ConversationType, MemberRole } from '@prisma/client';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { MessageResponseDto } from '../../messages/dto/message-response.dto';

export class ConversationMemberDto {
  id: string;
  userId: string;
  user: UserResponseDto;
  role: MemberRole;
  joinedAt: Date;
  lastReadAt: Date | null;
}

export class ConversationSummaryDto {
  id: string;
  type: ConversationType;
  title: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  members: ConversationMemberDto[];
  otherMember?: UserResponseDto | null; // Helper for direct 1-on-1 chats
  lastMessage?: MessageResponseDto | null;
  unreadCount: number;
}

export class ConversationDetailDto {
  id: string;
  type: ConversationType;
  title: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  members: ConversationMemberDto[];
}
