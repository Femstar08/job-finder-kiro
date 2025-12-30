import { JobMatch } from '../types';

export interface JobAlertData {
  jobs: JobMatch[];
  userFirstName?: string;
  profileName: string;
  totalMatches: number;
}

export class NotificationTemplateService {
  /**
   * Generate email HTML template for job alerts
   */
  generateJobAlertEmailHTML(data: JobAlertData): string {
    const { jobs, userFirstName, profileName, totalMatches } = data;
    const greeting = userFirstName ? `Hi ${userFirstName}` : 'Hello';
    const jobWord = totalMatches === 1 ? 'job' : 'jobs';

    const jobsHTML = jobs.map(job => `
      <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 15px 0; background-color: #f9f9f9;">
        <h3 style="margin: 0 0 10px 0; color: #2c3e50;">
          <a href="${job.jobUrl}" style="color: #3498db; text-decoration: none;">${job.jobTitle}</a>
        </h3>
        <p style="margin: 5px 0; color: #34495e;"><strong>Company:</strong> ${job.company || 'Not specified'}</p>
        <p style="margin: 5px 0; color: #34495e;"><strong>Location:</strong> ${job.location || 'Not specified'}</p>
        <p style="margin: 5px 0; color: #34495e;"><strong>Contract Type:</strong> ${job.contractType || 'Not specified'}</p>
        ${job.salary ? `<p style="margin: 5px 0; color: #34495e;"><strong>Salary:</strong> ${job.salary}</p>` : ''}
        <p style="margin: 5px 0; color: #7f8c8d;"><strong>Source:</strong> ${job.sourceWebsite}</p>
        <p style="margin: 15px 0 0 0;">
          <a href="${job.jobUrl}" 
             style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Job Details
          </a>
        </p>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Job Alert - ${profileName}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #3498db; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0;">🎯 Job Alert</h1>
          <p style="margin: 10px 0 0 0;">New opportunities matching your criteria</p>
        </div>
        
        <div style="background-color: white; padding: 20px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 20px 0; font-size: 16px;">
            ${greeting}! We found <strong>${totalMatches} new ${jobWord}</strong> matching your 
            "<strong>${profileName}</strong>" search criteria:
          </p>
          
          ${jobsHTML}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #7f8c8d; font-size: 14px;">
            <p>This alert was sent for your "${profileName}" job search profile.</p>
            <p>To manage your job search preferences, visit your Job Finder dashboard.</p>
            <p style="margin-top: 15px;">
              <a href="#" style="color: #3498db; text-decoration: none;">Manage Preferences</a> | 
              <a href="#" style="color: #3498db; text-decoration: none;">Unsubscribe</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email template for job alerts
   */
  generateJobAlertEmailText(data: JobAlertData): string {
    const { jobs, userFirstName, profileName, totalMatches } = data;
    const greeting = userFirstName ? `Hi ${userFirstName}` : 'Hello';
    const jobWord = totalMatches === 1 ? 'job' : 'jobs';

    const jobsText = jobs.map(job => `
📋 ${job.jobTitle}
🏢 Company: ${job.company || 'Not specified'}
📍 Location: ${job.location || 'Not specified'}
💼 Contract Type: ${job.contractType || 'Not specified'}
${job.salary ? `💰 Salary: ${job.salary}` : ''}
🌐 Source: ${job.sourceWebsite}
🔗 Apply: ${job.jobUrl}
${'─'.repeat(50)}
    `).join('\n');

    return `
🎯 JOB ALERT - ${profileName.toUpperCase()}

${greeting}! We found ${totalMatches} new ${jobWord} matching your "${profileName}" search criteria:

${jobsText}

This alert was sent for your "${profileName}" job search profile.
To manage your job search preferences, visit your Job Finder dashboard.

---
Job Finder System
Manage Preferences | Unsubscribe
    `.trim();
  }

  /**
   * Generate SMS template for job alerts
   */
  generateJobAlertSMS(data: JobAlertData): string {
    const { jobs, profileName, totalMatches } = data;
    const jobWord = totalMatches === 1 ? 'job' : 'jobs';

    if (totalMatches === 1) {
      const job = jobs[0];
      return `🎯 Job Alert: ${job.jobTitle} at ${job.company || 'Unknown Company'} (${job.location || 'Location TBD'}) - ${job.jobUrl}`;
    } else {
      return `🎯 Job Alert: ${totalMatches} new ${jobWord} found for "${profileName}". Check your email for details.`;
    }
  }

  /**
   * Generate notification subject line
   */
  generateJobAlertSubject(data: JobAlertData): string {
    const { profileName, totalMatches } = data;
    const jobWord = totalMatches === 1 ? 'Job' : 'Jobs';

    return `🎯 ${totalMatches} New ${jobWord} Found - ${profileName}`;
  }
}

export const notificationTemplateService = new NotificationTemplateService();