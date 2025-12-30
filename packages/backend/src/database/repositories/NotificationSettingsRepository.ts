import { BaseRepository } from './BaseRepository';
import { NotificationSettings } from '../../types';

export interface CreateNotificationSettingsData {
  userId: string;
  emailEnabled: boolean;
  emailAddress: string | null;
  emailConsolidateDaily: boolean;
  smsEnabled: boolean;
  smsPhoneNumber: string | null;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

export class NotificationSettingsRepository extends BaseRepository {
  async findByUserId(userId: string): Promise<NotificationSettings | null> {
    const query = `
      SELECT 
        user_id,
        email_enabled,
        email_address,
        email_consolidate_daily,
        sms_enabled,
        sms_phone_number,
        quiet_hours_enabled,
        quiet_hours_start,
        quiet_hours_end,
        created_at,
        updated_at
      FROM jf_notification_settings 
      WHERE user_id = $1
    `;

    const result = await this.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return this.mapRowToNotificationSettings(row);
  }

  async create(data: CreateNotificationSettingsData): Promise<NotificationSettings> {
    const query = `
      INSERT INTO jf_notification_settings (
        user_id,
        email_enabled,
        email_address,
        email_consolidate_daily,
        sms_enabled,
        sms_phone_number,
        quiet_hours_enabled,
        quiet_hours_start,
        quiet_hours_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING 
        user_id,
        email_enabled,
        email_address,
        email_consolidate_daily,
        sms_enabled,
        sms_phone_number,
        quiet_hours_enabled,
        quiet_hours_start,
        quiet_hours_end,
        created_at,
        updated_at
    `;

    const values = [
      data.userId,
      data.emailEnabled,
      data.emailAddress,
      data.emailConsolidateDaily,
      data.smsEnabled,
      data.smsPhoneNumber,
      data.quietHoursEnabled,
      data.quietHoursStart,
      data.quietHoursEnd,
    ];

    const result = await this.query(query, values);
    return this.mapRowToNotificationSettings(result.rows[0]);
  }

  async update(userId: string, data: Partial<CreateNotificationSettingsData>): Promise<NotificationSettings> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'userId' && value !== undefined) {
        const dbField = this.camelToSnakeCase(key);
        updateFields.push(`${dbField} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated_at
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add userId for WHERE clause
    values.push(userId);

    const query = `
      UPDATE jf_notification_settings 
      SET ${updateFields.join(', ')}
      WHERE user_id = $${paramIndex}
      RETURNING 
        user_id,
        email_enabled,
        email_address,
        email_consolidate_daily,
        sms_enabled,
        sms_phone_number,
        quiet_hours_enabled,
        quiet_hours_start,
        quiet_hours_end,
        created_at,
        updated_at
    `;

    const result = await this.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Notification settings not found');
    }

    return this.mapRowToNotificationSettings(result.rows[0]);
  }

  async upsert(data: CreateNotificationSettingsData): Promise<NotificationSettings> {
    const existing = await this.findByUserId(data.userId);

    if (existing) {
      return this.update(data.userId, data);
    } else {
      return this.create(data);
    }
  }

  private mapRowToNotificationSettings(row: any): NotificationSettings {
    return {
      userId: row.user_id,
      email: {
        enabled: row.email_enabled,
        address: row.email_address,
        consolidateDaily: row.email_consolidate_daily,
      },
      sms: {
        enabled: row.sms_enabled,
        phoneNumber: row.sms_phone_number,
      },
      quietHours: {
        enabled: row.quiet_hours_enabled,
        startTime: row.quiet_hours_start,
        endTime: row.quiet_hours_end,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}