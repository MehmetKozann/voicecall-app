import { MessageType, MessageStatus } from '@prisma/client';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AttachmentResponseDto {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  duration?: number | null;
  createdAt: Date;
}

export class MessageResponseDto {
  id: string;
  conversationId: string;
  senderId: string;
  sender: UserResponseDto;
  content: string | null;
  type: MessageType;
  status: MessageStatus;
  attachments: AttachmentResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

export class MessageListResponseDto {
  messages: MessageResponseDto[];
  nextCursor: string | null;
  hasMore: boolean;
}
