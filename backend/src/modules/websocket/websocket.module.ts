import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ChatGateway } from './chat.gateway';
import { MessagesModule } from '../messages/messages.module';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [
    JwtModule.register({}),
    ConfigModule,
    MessagesModule,
    ConversationsModule,
  ],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class WebsocketModule {}
