import { Request, Response } from 'express';
import { NotificationSettingsRepository } from '../database/repositories/NotificationSettingsRepository';
import { notificationService } from '../services/NotificationService';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types';

export class NotificationController {
  private notificationSettingsRepository: NotificationSettingsRepository;

  constructor() {
    this.notificationSettingsRepository = new NotificationSettingsRepository();
  }

  async getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      let settings = await this.notificationSettingsRepository.findByUserId(userId);

      // If no settings exist, create default settings
      if (!settings) {
        settings = await this.notificationSettingsRepository.create({
          userId,
          emailEnabled: true,
          emailAddress: req.user!.email,
          emailConsolidateDaily: false,
          smsEnabled: false,
          smsPhoneNumber: null,
          quietHoursEnabled: false,
          quietHoursStart: null,
          quietHoursEnd: null,
        });
      }

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      logger.error('Error fetching notification settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notification settings',
      });
    }
  }

  async updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const settingsData = req.body;

      // Ensure user ID is set
      settingsData.userId = userId;

      const settings = await this.notificationSettingsRepository.upsert(settingsData);

      logger.info('Notification settings updated', { userId, settings: settingsData });

      res.json({
        success: true,
        data: settings,
        message: 'Notification settings updated successfully',
      });
    } catch (error) {
      logger.error('Error updating notification settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification settings',
      });
    }
  }

  async sendTestNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { type, recipient } = req.body;
      const userId = req.user!.id;

      // Validate notification type
      if (!['email', 'sms'].includes(type)) {
        res.status(400).json({
          success: false,
          message: 'Invalid notification type. Must be email or sms',
        });
        return;
      }

      // For email, use user's email if no recipient provided
      let finalRecipient = recipient;
      if (type === 'email' && !recipient) {
        finalRecipient = req.user!.email;
      }

      if (!finalRecipient) {
        res.status(400).json({
          success: false,
          message: 'Recipient is required for test notification',
        });
        return;
      }

      const result = await notificationService.sendTestNotification(type, finalRecipient);

      logger.info('Test notification sent', {
        userId,
        type,
        recipient: finalRecipient,
        success: result.success,
      });

      if (result.success) {
        res.json({
          success: true,
          message: `Test ${type} notification sent successfully`,
          data: {
            messageId: result.messageId,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          message: `Failed to send test ${type} notification: ${result.error}`,
        });
      }
    } catch (error) {
      logger.error('Error sending test notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification',
      });
    }
  }
}