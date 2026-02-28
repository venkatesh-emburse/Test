import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class NotificationService implements OnModuleInit {
  private firebaseInitialized = false;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      if (admin.apps.length === 0) {
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

        if (serviceAccountPath) {
          // Resolve path relative to project root (process.cwd()), not the compiled JS file
          const absolutePath = path.resolve(process.cwd(), serviceAccountPath);

          if (!fs.existsSync(absolutePath)) {
            console.warn(`⚠️ Firebase service account file not found at: ${absolutePath}`);
            console.warn('⚠️ Push notifications will be disabled.');
            this.firebaseInitialized = false;
            return;
          }

          const serviceAccount = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          console.log(`🔔 Firebase Admin initialized with service account from: ${absolutePath}`);
        } else {
          // Fall back to project ID with application default credentials
          admin.initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID || 'chat-app-86df0',
          });
          console.log(
            '🔔 Firebase Admin initialized with project ID (no service account)',
          );
        }
      }
      this.firebaseInitialized = true;
    } catch (error) {
      console.warn(
        '⚠️ Firebase Admin init failed. Push notifications disabled:',
        error.message,
      );
      this.firebaseInitialized = false;
    }
  }

  /**
   * Send a push notification to a specific user by their user ID.
   * Looks up their FCM token from the database.
   */
  async sendPushToUser(
    recipientUserId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.firebaseInitialized) {
      console.log('⚠️ Firebase not initialized, skipping push notification');
      return false;
    }

    try {
      // Get recipient's FCM token
      const recipient = await this.userRepository.findOne({
        where: { id: recipientUserId },
        select: ['id', 'fcmToken'],
      });

      if (!recipient?.fcmToken) {
        console.log(
          `🔔 No FCM token for user ${recipientUserId}, skipping push`,
        );
        return false;
      }

      // Send the notification
      const message: admin.messaging.Message = {
        token: recipient.fcmToken,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'chat_messages',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log(`✅ Push notification sent to ${recipientUserId}: ${response}`);
      return true;
    } catch (error) {
      console.error(
        `❌ Push notification failed for ${recipientUserId}:`,
        error.message,
      );

      // If the token is invalid, remove it from the database
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        await this.userRepository.update(recipientUserId, {
          fcmToken: undefined,
        });
        console.log(`🔔 Removed invalid FCM token for user ${recipientUserId}`);
      }

      return false;
    }
  }

  /**
   * Send a chat message notification.
   */
  async sendChatNotification(
    recipientUserId: string,
    senderName: string,
    messageContent: string,
    matchId: string,
  ): Promise<boolean> {
    // Truncate message for notification preview
    const preview =
      messageContent.length > 100
        ? messageContent.substring(0, 100) + '...'
        : messageContent;

    return this.sendPushToUser(
      recipientUserId,
      `New message from ${senderName}`,
      preview,
      {
        type: 'chat_message',
        matchId,
        senderName,
      },
    );
  }
}
