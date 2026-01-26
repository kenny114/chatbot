import pool from '../config/database';
import {
  Lead,
  CreateLeadInput,
  IntentLevel,
  LeadBookingStatus,
  LeadAnalytics,
} from '../types/leadCapture';

export const leadCaptureService = {
  /**
   * Create a new lead
   */
  async createLead(input: CreateLeadInput): Promise<Lead> {
    const query = `
      INSERT INTO leads (
        chatbot_id, email, name, phone, reason_for_interest,
        page_url, referrer_url, intent_level, qualification_answers,
        questions_asked, message_count, conversation_summary,
        source_session_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const result = await pool.query(query, [
      input.chatbot_id,
      input.email,
      input.name || null,
      input.phone || null,
      input.reason_for_interest || null,
      input.page_url || null,
      input.referrer_url || null,
      input.intent_level || 'LOW_INTENT',
      JSON.stringify(input.qualification_answers || {}),
      JSON.stringify(input.questions_asked || []),
      input.message_count || 0,
      input.conversation_summary || null,
      input.source_session_id || null,
    ]);

    return this.mapRowToLead(result.rows[0]);
  },

  /**
   * Get a lead by ID
   */
  async getLeadById(leadId: string): Promise<Lead | null> {
    const query = `
      SELECT * FROM leads WHERE id = $1
    `;

    const result = await pool.query(query, [leadId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToLead(result.rows[0]);
  },

  /**
   * Get leads for a chatbot
   */
  async getLeadsByChatbot(
    chatbotId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      intentLevel?: IntentLevel;
      bookingStatus?: LeadBookingStatus;
    } = {}
  ): Promise<{ leads: Lead[]; total: number }> {
    const {
      limit = 50,
      offset = 0,
      startDate,
      endDate,
      intentLevel,
      bookingStatus,
    } = options;

    let whereClause = 'WHERE chatbot_id = $1';
    const params: any[] = [chatbotId];
    let paramCount = 2;

    if (startDate) {
      whereClause += ` AND created_at >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      whereClause += ` AND created_at <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    if (intentLevel) {
      whereClause += ` AND intent_level = $${paramCount}`;
      params.push(intentLevel);
      paramCount++;
    }

    if (bookingStatus) {
      whereClause += ` AND booking_status = $${paramCount}`;
      params.push(bookingStatus);
      paramCount++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM leads ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get leads
    const query = `
      SELECT * FROM leads
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(limit, offset);
    const result = await pool.query(query, params);

    return {
      leads: result.rows.map(this.mapRowToLead),
      total,
    };
  },

  /**
   * Get leads for a user (across all chatbots)
   */
  async getLeadsByUser(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      chatbotId?: string;
    } = {}
  ): Promise<{ leads: Lead[]; total: number }> {
    const { limit = 50, offset = 0, chatbotId } = options;

    let query = `
      SELECT l.* FROM leads l
      JOIN chatbots c ON l.chatbot_id = c.id
      WHERE c.user_id = $1
    `;
    const params: any[] = [userId];
    let paramCount = 2;

    if (chatbotId) {
      query += ` AND l.chatbot_id = $${paramCount}`;
      params.push(chatbotId);
      paramCount++;
    }

    // Get total count
    const countQuery = query.replace('SELECT l.*', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get leads with pagination
    query += ` ORDER BY l.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return {
      leads: result.rows.map(this.mapRowToLead),
      total,
    };
  },

  /**
   * Update a lead
   */
  async updateLead(
    leadId: string,
    updates: Partial<{
      name: string;
      phone: string;
      reason_for_interest: string;
      qualification_answers: Record<string, string>;
      booking_status: LeadBookingStatus;
      booking_scheduled_at: Date;
      owner_notified: boolean;
      notification_sent_at: Date;
      notification_method: string;
      conversation_summary: string;
    }>
  ): Promise<Lead | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        // Handle JSON fields
        if (key === 'qualification_answers') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return this.getLeadById(leadId);
    }

    values.push(leadId);

    const query = `
      UPDATE leads
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToLead(result.rows[0]);
  },

  /**
   * Delete a lead
   */
  async deleteLead(leadId: string): Promise<boolean> {
    const query = `DELETE FROM leads WHERE id = $1`;
    const result = await pool.query(query, [leadId]);
    return result.rowCount !== null && result.rowCount > 0;
  },

  /**
   * Mark lead as notified
   */
  async markAsNotified(
    leadId: string,
    method: 'email' | 'webhook' | 'dashboard'
  ): Promise<Lead | null> {
    return this.updateLead(leadId, {
      owner_notified: true,
      notification_sent_at: new Date(),
      notification_method: method,
    });
  },

  /**
   * Update booking status
   */
  async updateBookingStatus(
    leadId: string,
    status: LeadBookingStatus,
    scheduledAt?: Date
  ): Promise<Lead | null> {
    const updates: any = { booking_status: status };
    if (scheduledAt) {
      updates.booking_scheduled_at = scheduledAt;
    }
    return this.updateLead(leadId, updates);
  },

  /**
   * Get lead analytics for a chatbot
   */
  async getLeadAnalytics(chatbotId: string): Promise<LeadAnalytics> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const query = `
      SELECT
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE created_at >= $2) as leads_today,
        COUNT(*) FILTER (WHERE created_at >= $3) as leads_this_week,
        COUNT(*) FILTER (WHERE created_at >= $4) as leads_this_month,
        COUNT(*) FILTER (WHERE booking_status = 'BOOKED') as booked_count,
        COUNT(*) FILTER (WHERE intent_level = 'HIGH_INTENT') as high_intent_count,
        AVG(message_count) as avg_messages
      FROM leads
      WHERE chatbot_id = $1
    `;

    const result = await pool.query(query, [
      chatbotId,
      startOfDay,
      startOfWeek,
      startOfMonth,
    ]);

    const row = result.rows[0];
    const totalLeads = parseInt(row.total_leads) || 0;
    const bookedCount = parseInt(row.booked_count) || 0;
    const highIntentCount = parseInt(row.high_intent_count) || 0;

    // Get conversation count for conversion rate
    const convQuery = `
      SELECT COUNT(*) FROM conversation_analytics WHERE chatbot_id = $1
    `;
    const convResult = await pool.query(convQuery, [chatbotId]);
    const totalConversations = parseInt(convResult.rows[0].count) || 0;

    return {
      total_leads: totalLeads,
      leads_today: parseInt(row.leads_today) || 0,
      leads_this_week: parseInt(row.leads_this_week) || 0,
      leads_this_month: parseInt(row.leads_this_month) || 0,
      conversion_rate: totalConversations > 0 ? (totalLeads / totalConversations) * 100 : 0,
      booking_rate: totalLeads > 0 ? (bookedCount / totalLeads) * 100 : 0,
      high_intent_percentage: totalLeads > 0 ? (highIntentCount / totalLeads) * 100 : 0,
      average_messages_before_capture: parseFloat(row.avg_messages) || 0,
    };
  },

  /**
   * Check if email already exists for chatbot
   */
  async emailExists(chatbotId: string, email: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM leads
      WHERE chatbot_id = $1 AND email = $2
      LIMIT 1
    `;

    const result = await pool.query(query, [chatbotId, email.toLowerCase()]);
    return result.rows.length > 0;
  },

  /**
   * Get questions asked during conversation for a lead
   */
  async getQuestionsAsked(sessionId: string): Promise<string[]> {
    const query = `
      SELECT user_message FROM conversation_analytics
      WHERE user_identifier = $1
      ORDER BY created_at ASC
    `;

    const result = await pool.query(query, [sessionId]);
    return result.rows.map(row => row.user_message);
  },

  /**
   * Generate conversation summary from history
   */
  generateConversationSummary(
    questions: string[],
    intentLevel: IntentLevel,
    qualificationAnswers: Record<string, string>
  ): string {
    const parts: string[] = [];

    if (questions.length > 0) {
      parts.push(`Asked ${questions.length} question(s) about: ${questions.slice(0, 3).join(', ')}${questions.length > 3 ? '...' : ''}`);
    }

    parts.push(`Intent: ${intentLevel.replace('_', ' ').toLowerCase()}`);

    const qualificationEntries = Object.entries(qualificationAnswers);
    if (qualificationEntries.length > 0) {
      parts.push('Qualification: ' + qualificationEntries.map(([k, v]) => `${k}: ${v}`).join('; '));
    }

    return parts.join('. ');
  },

  /**
   * Map database row to Lead object
   */
  mapRowToLead(row: any): Lead {
    return {
      id: row.id,
      chatbot_id: row.chatbot_id,
      email: row.email,
      name: row.name,
      phone: row.phone,
      reason_for_interest: row.reason_for_interest,
      page_url: row.page_url,
      referrer_url: row.referrer_url,
      intent_level: row.intent_level,
      qualification_answers: row.qualification_answers || {},
      questions_asked: row.questions_asked || [],
      message_count: row.message_count || 0,
      conversation_summary: row.conversation_summary,
      booking_status: row.booking_status,
      booking_scheduled_at: row.booking_scheduled_at,
      owner_notified: row.owner_notified,
      notification_sent_at: row.notification_sent_at,
      notification_method: row.notification_method,
      source_session_id: row.source_session_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  },
};
