import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { MessagesService } from '../messages/messages.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import {
  ConversationDetailDto,
  ConversationSummaryDto,
} from './dto/conversation-response.dto';
import { MessageListResponseDto } from '../messages/dto/message-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
  ) {}

  @Get()
  async getConversations(@CurrentUser('id') userId: string): Promise<ConversationSummaryDto[]> {
    return this.conversationsService.getUserConversations(userId);
  }

  @Post()
  async createConversation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationDetailDto> {
    return this.conversationsService.createConversation(userId, dto);
  }

  @Get(':id')
  async getConversation(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string,
  ): Promise<ConversationDetailDto> {
    return this.conversationsService.getConversationById(conversationId, userId);
  }

  @Get(':id/messages')
  async getMessages(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<MessageListResponseDto> {
    const limitNum = limit ? parseInt(limit, 10) : 30;
    return this.messagesService.getConversationMessages(
      conversationId,
      userId,
      cursor,
      limitNum,
    );
  }

  @Post(':id/read')
  async markRead(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string,
  ) {
    return this.conversationsService.markAsRead(conversationId, userId);
  }
}
