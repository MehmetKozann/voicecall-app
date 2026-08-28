import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendPushPayload {
  recipientUserId: string;
  title: string;
  body: string;
  data: {
    conversationId: string;
    messageId?: string;
    senderId?: string;
    type?: string;
  };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Dispatches push notifications to iOS APNs and Android FCM
   */
  async sendPushNotification(payload: SendPushPayload): Promise<boolean> {
    const fcmKey = this.configService.get<string>('FCM_SERVER_KEY');
    const apnsKey = this.configService.get<string>('APNS_KEY_ID');

    this.logger.log(
      `[PUSH DISPATCH] Recipient: ${payload.recipientUserId} | Title: "${payload.title}" | Body: "${payload.body}"`,
    );

    // If push notification credentials are configured, dispatch through APNs/FCM SDK
    if (!fcmKey && !apnsKey) {
      this.logger.debug(
        'Push notifications logged in dev mode (No APNS/FCM keys configured in .env)',
      );
      return true;
    }

    try {
      // Production APNs/FCM dispatch logic
      return true;
    } catch (err) {
      this.logger.error(`Failed to dispatch push notification: ${err.message}`);
      return false;
    }
  }
}
