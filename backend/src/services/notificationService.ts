import nodemailer from 'nodemailer';
import pool from '../config/database';
import {
  Lead,
  NotificationType,
  NotificationDeliveryMethod,
  NotificationPayload,
  NotificationLog,
  LeadCaptureConfig,
} from '../types/leadCapture';

// Create email transporter using Gmail SMTP
const createTransporter = () => {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn('Gmail credentials not configured. Email notifications disabled.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });
};

let transporter: nodemailer.Transporter | null = null;

// Initialize transporter lazily
const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

export const notificationService = {
  /**
   * Notify business owner of a new lead
   */
  async notifyNewLead(
    chatbotId: string,
    lead: Lead,
    config: LeadCaptureConfig
  ): Promise<boolean> {
    if (!config.notify_on_lead) return false;

    const payload: NotificationPayload = {
      lead_id: lead.id,
      email: lead.email,
      name: lead.name,
      page_url: lead.page_url,
      questions_asked: lead.questions_asked,
      intent_level: lead.intent_level,
      qualification_answers: lead.qualification_answers,
      booking_status: lead.booking_status,
      conversation_summary: lead.conversation_summary,
      timestamp: new Date().toISOString(),
    };

    let success = false;

    // Try email notification
    if (config.notification_email) {
      success = await this.sendEmailNotification(
        config.notification_email,
        `New Lead Captured: ${lead.email}`,
        this.buildLeadEmailContent(lead),
        chatbotId,
        lead.id,
        'NEW_LEAD',
        payload
      );
    }

    // Try webhook notification
    if (config.notification_webhook_url) {
      const webhookSuccess = await this.sendWebhookNotification(
        config.notification_webhook_url,
        payload,
        chatbotId,
        lead.id,
        'NEW_LEAD'
      );
      success = success || webhookSuccess;
    }

    return success;
  },

  /**
   * Notify business owner of a booking
   */
  async notifyBookingScheduled(
    chatbotId: string,
    lead: Lead,
    config: LeadCaptureConfig
  ): Promise<boolean> {
    if (!config.notify_on_booking) return false;

    const payload: NotificationPayload = {
      lead_id: lead.id,
      email: lead.email,
      name: lead.name,
      page_url: lead.page_url,
      intent_level: lead.intent_level,
      booking_status: lead.booking_status,
      timestamp: new Date().toISOString(),
    };

    let success = false;

    // Try email notification
    if (config.notification_email) {
      success = await this.sendEmailNotification(
        config.notification_email,
        `Call Booked: ${lead.name || lead.email}`,
        this.buildBookingEmailContent(lead),
        chatbotId,
        lead.id,
        'BOOKING_SCHEDULED',
        payload
      );
    }

    // Try webhook notification
    if (config.notification_webhook_url) {
      const webhookSuccess = await this.sendWebhookNotification(
        config.notification_webhook_url,
        payload,
        chatbotId,
        lead.id,
        'BOOKING_SCHEDULED'
      );
      success = success || webhookSuccess;
    }

    return success;
  },

  /**
   * Send email notification
   */
  async sendEmailNotification(
    to: string,
    subject: string,
    content: { text: string; html: string },
    chatbotId: string,
    leadId: string,
    notificationType: NotificationType,
    payload: NotificationPayload
  ): Promise<boolean> {
    const emailTransporter = getTransporter();

    // Log the notification attempt
    const logId = await this.logNotification(
      chatbotId,
      leadId,
      notificationType,
      'email',
      payload
    );

    if (!emailTransporter) {
      await this.updateNotificationStatus(logId, 'failed', 'Email transporter not configured');
      return false;
    }

    try {
      await emailTransporter.sendMail({
        from: process.env.GMAIL_USER,
        to,
        subject,
        text: content.text,
        html: content.html,
      });

      await this.updateNotificationStatus(logId, 'sent');
      return true;
    } catch (error: any) {
      console.error('Email notification error:', error);
      await this.updateNotificationStatus(logId, 'failed', error.message);
      return false;
    }
  },

  /**
   * Send webhook notification
   */
  async sendWebhookNotification(
    url: string,
    payload: NotificationPayload,
    chatbotId: string,
    leadId: string,
    notificationType: NotificationType
  ): Promise<boolean> {
    // Log the notification attempt
    const logId = await this.logNotification(
      chatbotId,
      leadId,
      notificationType,
      'webhook',
      payload
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await this.updateNotificationStatus(logId, 'delivered');
        return true;
      } else {
        await this.updateNotificationStatus(logId, 'failed', `HTTP ${response.status}`);
        return false;
      }
    } catch (error: any) {
      console.error('Webhook notification error:', error);
      await this.updateNotificationStatus(logId, 'failed', error.message);
      return false;
    }
  },

  /**
   * Log a notification attempt
   */
  async logNotification(
    chatbotId: string,
    leadId: string,
    notificationType: NotificationType,
    deliveryMethod: NotificationDeliveryMethod,
    payload: NotificationPayload
  ): Promise<string> {
    const query = `
      INSERT INTO notification_log (
        chatbot_id, lead_id, notification_type, delivery_method, status, payload
      )
      VALUES ($1, $2, $3, $4, 'pending', $5)
      RETURNING id
    `;

    const result = await pool.query(query, [
      chatbotId,
      leadId,
      notificationType,
      deliveryMethod,
      JSON.stringify(payload),
    ]);

    return result.rows[0].id;
  },

  /**
   * Update notification status
   */
  async updateNotificationStatus(
    logId: string,
    status: 'sent' | 'delivered' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    const query = `
      UPDATE notification_log
      SET status = $1,
          error_message = $2,
          ${status === 'sent' ? 'sent_at = CURRENT_TIMESTAMP,' : ''}
          ${status === 'delivered' ? 'delivered_at = CURRENT_TIMESTAMP,' : ''}
          error_message = $2
      WHERE id = $3
    `;

    await pool.query(query.replace(/,\s*error_message = \$2\s*WHERE/, ' WHERE'), [
      status,
      errorMessage || null,
      logId,
    ]);
  },

  /**
   * Get notification logs for a chatbot
   */
  async getNotificationLogs(
    chatbotId: string,
    limit: number = 50
  ): Promise<NotificationLog[]> {
    const query = `
      SELECT * FROM notification_log
      WHERE chatbot_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [chatbotId, limit]);
    return result.rows;
  },

  /**
   * Build email content for new lead notification
   */
  buildLeadEmailContent(lead: Lead): { text: string; html: string } {
    const text = `
New Lead Captured!

Contact Information:
- Email: ${lead.email}
- Name: ${lead.name || 'Not provided'}
${lead.phone ? `- Phone: ${lead.phone}` : ''}

Context:
- Page: ${lead.page_url || 'Unknown'}
- Intent Level: ${lead.intent_level?.replace('_', ' ') || 'Unknown'}
${lead.reason_for_interest ? `- Interest: ${lead.reason_for_interest}` : ''}

Questions Asked:
${lead.questions_asked?.length > 0 ? lead.questions_asked.map(q => `- ${q}`).join('\n') : '- None recorded'}

${lead.conversation_summary ? `Summary: ${lead.conversation_summary}` : ''}

---
This notification was sent by your AI Chatbot.
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6366f1; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .section { margin-bottom: 20px; }
    .section-title { font-weight: bold; color: #6366f1; margin-bottom: 8px; }
    .intent-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
    .intent-high { background: #dcfce7; color: #166534; }
    .intent-medium { background: #fef9c3; color: #854d0e; }
    .intent-low { background: #f3f4f6; color: #6b7280; }
    .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">New Lead Captured!</h2>
    </div>
    <div class="content">
      <div class="section">
        <div class="section-title">Contact Information</div>
        <p><strong>Email:</strong> ${lead.email}</p>
        <p><strong>Name:</strong> ${lead.name || 'Not provided'}</p>
        ${lead.phone ? `<p><strong>Phone:</strong> ${lead.phone}</p>` : ''}
      </div>

      <div class="section">
        <div class="section-title">Context</div>
        <p><strong>Page:</strong> ${lead.page_url || 'Unknown'}</p>
        <p><strong>Intent:</strong>
          <span class="intent-badge intent-${lead.intent_level?.toLowerCase().replace('_intent', '') || 'low'}">
            ${lead.intent_level?.replace('_', ' ') || 'Unknown'}
          </span>
        </p>
        ${lead.reason_for_interest ? `<p><strong>Interest:</strong> ${lead.reason_for_interest}</p>` : ''}
      </div>

      ${lead.questions_asked && lead.questions_asked.length > 0 ? `
      <div class="section">
        <div class="section-title">Questions Asked</div>
        <ul>
          ${lead.questions_asked.map(q => `<li>${q}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      ${lead.conversation_summary ? `
      <div class="section">
        <div class="section-title">Summary</div>
        <p>${lead.conversation_summary}</p>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      This notification was sent by your AI Chatbot.
    </div>
  </div>
</body>
</html>
    `.trim();

    return { text, html };
  },

  /**
   * Build email content for booking notification
   */
  buildBookingEmailContent(lead: Lead): { text: string; html: string } {
    const text = `
Call Booked!

A visitor has scheduled a call:

- Name: ${lead.name || 'Not provided'}
- Email: ${lead.email}
- Page: ${lead.page_url || 'Unknown'}
- Intent: ${lead.intent_level?.replace('_', ' ') || 'Unknown'}

---
This notification was sent by your AI Chatbot.
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">Call Booked!</h2>
    </div>
    <div class="content">
      <p>A visitor has scheduled a call:</p>
      <p><strong>Name:</strong> ${lead.name || 'Not provided'}</p>
      <p><strong>Email:</strong> ${lead.email}</p>
      <p><strong>Page:</strong> ${lead.page_url || 'Unknown'}</p>
      <p><strong>Intent:</strong> ${lead.intent_level?.replace('_', ' ') || 'Unknown'}</p>
    </div>
    <div class="footer">
      This notification was sent by your AI Chatbot.
    </div>
  </div>
</body>
</html>
    `.trim();

    return { text, html };
  },
};
