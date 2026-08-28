import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ConversationType } from '@prisma/client';

export class CreateConversationDto {
  @IsOptional()
  @IsEnum(ConversationType)
  type?: ConversationType = ConversationType.DIRECT;

  @IsOptional()
  @IsString()
  title?: string;

  // For 1-on-1 direct conversation
  @IsOptional()
  @IsUUID('4', { message: 'participantId must be a valid UUID' })
  participantId?: string;

  // For group conversation
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each participantId must be a valid UUID' })
  participantIds?: string[];
}
