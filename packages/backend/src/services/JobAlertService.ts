import { NotificationService } from './NotificationService';
import { NotificationTemplateService } from './NotificationTemplateService';
import { NotificationSettingsRepository } from '../database/repositories/NotificationSettingsRepository';
import { JobMatch, NotificationSettings } from '../types';
import { logger } from '../utils/logger';

export interface JobAlertOptions {
  respectQuietHours?: boolean;
  consolidateAlerts?: boolean;
  maxAlertsPerExecution?: number;
}

export interface AlertDeliveryResult {
  success: boolean;
  emailSent: boolean;
  smsSent: boolean;
  errors: string[];
  messageIds: {
    email?: string;
    sms?: string;
  };
}

export class JobAlertService {
  private notificationService: NotificationService;
  private templateService: NotificationTemplateService;
  private settingsRepository: NotificationSettingsRepository;

  constructor() {
    this.notificationService = new NotificationService();
    this.templateService = new NotificationTemplateService();
    this.settingsRepository = new NotificationSettingsRepository();
  }

  /**
   * Send job alerts to a user for matching jobs
   */
  async sendJobAlerts(
    userId: string,
    jobs: JobMatch[],
    profileName: string,
    userFirstName?: string,
    options: JobAlertOptions = {}
  ): Promise<AlertDeliveryResult> {
    const result: AlertDeliveryResult = {
      success: false,
      emailSent: false,
      smsSent: false,
      errors: [],
      messageIds: {},
    };

    try {
      // Get user notification settings
      const settings = await this.settingsRepository.findByUserId(userId);
      if (!settings) {
        result.errors.push('User notification settings not found');
        return result;
      }

      // Check quiet hours if enabled
      if (options.respectQuietHours && this.isQuietHours(settings)) {
        logger.info('Skipping alerts due to quiet hours', { userId, profileName });
        result.errors.push('Alerts skipped due to quiet hours');
        return result;
      }

      // Prepare alert data
      const alertData = {
        jobs,
        userFirstName,
        profileName,
        totalMatches: jobs.length,
      };

      // Send email notification
      if (settings.email.enabled && settings.email.address) {
        try {
          const emailResult = await this.sendEmailAlert(settings.email.address, alertData);
          if (emailResult.success) {
            result.emailSent = true;
            result.messageIds.email = emailResult.messageId;
          } else {
            result.errors.push(`Email failed: ${emailResult.error}`);
          }
        } catch (error) {
          result.errors.push(`Email error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Send SMS notification
      if (settings.sms.enabled && settings.sms.phoneNumber) {
        try {
          const smsResult = await this.sendSMSAlert(settings.sms.phoneNumber, alertData);
          if (smsResult.success) {
            result.smsSent = true;
            result.messageIds.sms = smsResult.messageId;
          } else {
            result.errors.push(`SMS failed: ${smsResult.error}`);
          }
        } catch (error) {
          result.errors.push(`SMS error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Consider success if at least one notification was sent
      result.success = result.emailSent || result.smsSent;

      logger.info('Job alerts sent', {
        userId,
        profileName,
        jobCount: jobs.length,
        emailSent: result.emailSent,
        smsSent: result.smsSent,
        errors: result.errors,
      });

      return result;
    } catch (error) {
      logger.error('Failed to send job alerts:', error);
      result.errors.push(`Service error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Send consolidated job alerts for multiple profiles
   */
  async sendConsolidatedAlerts(
    userId: string,
    alertsByProfile: Map<string, { jobs: JobMatch[]; profileName: string }>,
    userFirstName?: string,
    options: JobAlertOptions = {}
  ): Promise<AlertDeliveryResult[]> {
    const results: AlertDeliveryResult[] = [];

    for (const [profileId, { jobs, profileName }] of alertsByProfile) {
      const result = await this.sendJobAlerts(userId, jobs, profileName, userFirstName, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(emailAddress: string, alertData: any) {
    const subject = this.templateService.generateJobAlertSubject(alertData);
    const html = this.templateService.generateJobAlertEmailHTML(alertData);
    const text = this.templateService.generateJobAlertEmailText(alertData);

    return this.notificationService.sendEmail({
      to: emailAddress,
      subject,
      html,
      text,
    });
  }

  /**
   * Send SMS alert
   */
  private async sendSMSAlert(phoneNumber: string, alertData: any) {
    const message = this.templateService.generateJobAlertSMS(alertData);

    return this.notificationService.sendSMS({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(settings: NotificationSettings): boolean {
    if (!settings.quietHours.enabled || !settings.quietHours.startTime || !settings.quietHours.endTime) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const startTime = settings.quietHours.startTime;
    const endTime = settings.quietHours.endTime;

    // Handle quiet hours that span midnight
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * Get delivery statistics for monitoring
   */
  async getDeliveryStats(userId: string, days: number = 7): Promise<{
    totalAlerts: number;
    emailsSent: number;
    smsSent: number;
    failedDeliveries: number;
  }> {
    // This would typically query a delivery log table
    // For now, return placeholder data
    return {
      totalAlerts: 0,
      emailsSent: 0,
      smsSent: 0,
      failedDeliveries: 0,
    };
  }

  /**
   * Test all notification channels for a user
   */
  async testAllChannels(userId: string): Promise<{
    email: boolean;
    sms: boolean;
    errors: string[];
  }> {
    const result: {
      email: boolean;
      sms: boolean;
      errors: string[];
    } = {
      email: false,
      sms: false,
      errors: [],
    };

    try {
      const settings = await this.settingsRepository.findByUserId(userId);
      if (!settings) {
        result.errors.push('User notification settings not found');
        return result;
      }

      // Test email
      if (settings.email.enabled && settings.email.address) {
        const emailResult = await this.notificationService.sendTestNotification('email', settings.email.address);
        result.email = emailResult.success;
        if (!emailResult.success) {
          result.errors.push(`Email test failed: ${emailResult.error}`);
        }
      }

      // Test SMS
      if (settings.sms.enabled && settings.sms.phoneNumber) {
        const smsResult = await this.notificationService.sendTestNotification('sms', settings.sms.phoneNumber);
        result.sms = smsResult.success;
        if (!smsResult.success) {
          result.errors.push(`SMS test failed: ${smsResult.error}`);
        }
      }

      return result;
    } catch (error) {
      result.errors.push(`Test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }
}

export const jobAlertService = new JobAlertService();