import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { MessageType } from '@prisma/client';

export class SendMessageDto {
  @IsUUID('4', { message: 'conversationId must be a valid UUID' })
  conversationId: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType = MessageType.TEXT;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}
