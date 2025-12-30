import * as brevo from '@getbrevo/brevo';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SMSNotification {
  to: string;
  message: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class NotificationService {
  private brevoApiInstance: brevo.TransactionalEmailsApi | null = null;
  private brevoSmsInstance: brevo.TransactionalSMSApi | null = null;

  constructor() {
    this.initializeBrevo();
  }

  private initializeBrevo(): void {
    if (!config.notifications.brevo.apiKey) {
      logger.warn('Brevo API key not provided');
      return;
    }

    // Initialize Brevo API client
    const defaultClient = brevo.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = config.notifications.brevo.apiKey;

    this.brevoApiInstance = new brevo.TransactionalEmailsApi();
    this.brevoSmsInstance = new brevo.TransactionalSMSApi();

    logger.info('Brevo initialized successfully');
  }

  async sendEmail(notification: EmailNotification): Promise<NotificationResult> {
    try {
      if (!config.notifications.brevo.apiKey || !this.brevoApiInstance) {
        throw new Error('Brevo not configured');
      }

      const sendSmtpEmail = new brevo.SendSmtpEmail();
      sendSmtpEmail.sender = {
        email: config.notifications.brevo.senderEmail,
        name: config.notifications.brevo.senderName,
      };
      sendSmtpEmail.to = [{ email: notification.to }];
      sendSmtpEmail.subject = notification.subject;
      sendSmtpEmail.htmlContent = notification.html;
      sendSmtpEmail.textContent = notification.text || notification.html.replace(/<[^>]*>/g, '');

      const response = await this.brevoApiInstance.sendTransacEmail(sendSmtpEmail);

      logger.info('Email sent successfully via Brevo', {
        to: notification.to,
        subject: notification.subject,
        messageId: response.messageId,
      });

      return {
        success: true,
        messageId: response.messageId,
      };
    } catch (error) {
      logger.error('Failed to send email via Brevo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendSMS(notification: SMSNotification): Promise<NotificationResult> {
    try {
      if (!config.notifications.brevo.apiKey || !this.brevoSmsInstance) {
        throw new Error('Brevo not configured');
      }

      const sendTransacSms = new brevo.SendTransacSms();
      sendTransacSms.sender = config.notifications.brevo.senderName;
      sendTransacSms.recipient = notification.to;
      sendTransacSms.content = notification.message;
      sendTransacSms.type = 'transactional';

      const response = await this.brevoSmsInstance.sendTransacSms(sendTransacSms);

      logger.info('SMS sent successfully via Brevo', {
        to: notification.to,
        messageId: response.reference,
      });

      return {
        success: true,
        messageId: response.reference,
      };
    } catch (error) {
      logger.error('Failed to send SMS via Brevo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendTestNotification(
    type: 'email' | 'sms',
    recipient: string
  ): Promise<NotificationResult> {
    const testMessage = {
      title: 'Job Finder Test Notification',
      body: 'This is a test notification from your Job Finder system.',
    };

    switch (type) {
      case 'email':
        return this.sendEmail({
          to: recipient,
          subject: testMessage.title,
          html: `<h2>${testMessage.title}</h2><p>${testMessage.body}</p>`,
          text: `${testMessage.title}\n\n${testMessage.body}`,
        });

      case 'sms':
        return this.sendSMS({
          to: recipient,
          message: `${testMessage.title}: ${testMessage.body}`,
        });

      default:
        return {
          success: false,
          error: 'Invalid notification type',
        };
    }
  }
}

// Create singleton instance
export const notificationService = new NotificationService();