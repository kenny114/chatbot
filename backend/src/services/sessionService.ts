import pool from '../config/database';
import {
  ConversationSession,
  ConversationMode,
  IntentLevel,
  LeadCaptureStep,
  BookingStatus,
  SessionMessage,
  SessionContext,
} from '../types/leadCapture';

const MAX_MESSAGE_HISTORY = 10;
const SESSION_EXPIRY_HOURS = 24;

export const sessionService = {
  /**
   * Get or create a conversation session
   */
  async getOrCreateSession(
    chatbotId: string,
    sessionId: string,
    context: SessionContext = {}
  ): Promise<ConversationSession> {
    // Try to get existing session
    const existingSession = await this.getSession(chatbotId, sessionId);

    if (existingSession) {
      // Check if session is expired
      const lastActivity = new Date(existingSession.last_activity_at);
      const now = new Date();
      const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

      if (hoursSinceActivity > SESSION_EXPIRY_HOURS) {
        // Close expired session and create new one
        await this.closeSession(existingSession.id);
        return this.createSession(chatbotId, sessionId, context);
      }

      // Update context if provided
      if (context.page_url || context.user_agent || context.user_ip) {
        await this.updateSessionContext(existingSession.id, context);
      }

      return existingSession;
    }

    // Create new session
    return this.createSession(chatbotId, sessionId, context);
  },

  /**
   * Get a session by chatbot and session ID
   */
  async getSession(chatbotId: string, sessionId: string): Promise<ConversationSession | null> {
    const query = `
      SELECT
        id, chatbot_id, session_id, conversation_mode, intent_level,
        intent_signals, lead_capture_step, qualification_step,
        qualification_answers, page_url, referrer_url, user_agent,
        user_ip, message_history, message_count, lead_id,
        booking_status, booking_link_clicked_at, started_at,
        last_activity_at, closed_at
      FROM conversation_sessions
      WHERE chatbot_id = $1 AND session_id = $2 AND closed_at IS NULL
    `;

    const result = await pool.query(query, [chatbotId, sessionId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSession(result.rows[0]);
  },

  /**
   * Get a session by ID
   */
  async getSessionById(id: string): Promise<ConversationSession | null> {
    const query = `
      SELECT
        id, chatbot_id, session_id, conversation_mode, intent_level,
        intent_signals, lead_capture_step, qualification_step,
        qualification_answers, page_url, referrer_url, user_agent,
        user_ip, message_history, message_count, lead_id,
        booking_status, booking_link_clicked_at, started_at,
        last_activity_at, closed_at
      FROM conversation_sessions
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSession(result.rows[0]);
  },

  /**
   * Create a new conversation session
   */
  async createSession(
    chatbotId: string,
    sessionId: string,
    context: SessionContext = {}
  ): Promise<ConversationSession> {
    const query = `
      INSERT INTO conversation_sessions (
        chatbot_id, session_id, conversation_mode, intent_level,
        page_url, referrer_url, user_agent, user_ip
      )
      VALUES ($1, $2, 'INFO_MODE', 'LOW_INTENT', $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [
      chatbotId,
      sessionId,
      context.page_url || null,
      context.referrer_url || null,
      context.user_agent || null,
      context.user_ip || null,
    ]);

    return this.mapRowToSession(result.rows[0]);
  },

  /**
   * Update session state
   */
  async updateSession(
    sessionId: string,
    updates: Partial<{
      conversation_mode: ConversationMode;
      intent_level: IntentLevel;
      intent_signals: string[];
      lead_capture_step: LeadCaptureStep;
      qualification_step: number;
      qualification_answers: Record<string, string>;
      lead_id: string;
      booking_status: BookingStatus;
      booking_link_clicked_at: string;
    }>
  ): Promise<ConversationSession | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Build dynamic UPDATE query
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        // Handle JSON fields
        if (key === 'intent_signals' || key === 'qualification_answers') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return this.getSessionById(sessionId);
    }

    values.push(sessionId);

    const query = `
      UPDATE conversation_sessions
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSession(result.rows[0]);
  },

  /**
   * Update session context (page URL, user agent, etc.)
   */
  async updateSessionContext(
    sessionId: string,
    context: SessionContext
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (context.page_url) {
      fields.push(`page_url = $${paramCount}`);
      values.push(context.page_url);
      paramCount++;
    }
    if (context.referrer_url) {
      fields.push(`referrer_url = $${paramCount}`);
      values.push(context.referrer_url);
      paramCount++;
    }
    if (context.user_agent) {
      fields.push(`user_agent = $${paramCount}`);
      values.push(context.user_agent);
      paramCount++;
    }
    if (context.user_ip) {
      fields.push(`user_ip = $${paramCount}`);
      values.push(context.user_ip);
      paramCount++;
    }

    if (fields.length === 0) return;

    values.push(sessionId);

    const query = `
      UPDATE conversation_sessions
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
    `;

    await pool.query(query, values);
  },

  /**
   * Add a message to the session history
   */
  async addMessageToHistory(
    sessionId: string,
    message: SessionMessage
  ): Promise<void> {
    // Get current history
    const session = await this.getSessionById(sessionId);
    if (!session) return;

    // Add new message and trim to max size
    const newHistory = [...session.message_history, message];
    if (newHistory.length > MAX_MESSAGE_HISTORY) {
      newHistory.splice(0, newHistory.length - MAX_MESSAGE_HISTORY);
    }

    const query = `
      UPDATE conversation_sessions
      SET message_history = $1, message_count = message_count + 1
      WHERE id = $2
    `;

    await pool.query(query, [JSON.stringify(newHistory), sessionId]);
  },

  /**
   * Close a session
   */
  async closeSession(sessionId: string): Promise<void> {
    const query = `
      UPDATE conversation_sessions
      SET closed_at = CURRENT_TIMESTAMP, conversation_mode = 'CLOSURE_MODE'
      WHERE id = $1
    `;

    await pool.query(query, [sessionId]);
  },

  /**
   * Get active sessions for a chatbot
   */
  async getActiveSessions(chatbotId: string): Promise<ConversationSession[]> {
    const query = `
      SELECT *
      FROM conversation_sessions
      WHERE chatbot_id = $1 AND closed_at IS NULL
      ORDER BY last_activity_at DESC
      LIMIT 100
    `;

    const result = await pool.query(query, [chatbotId]);
    return result.rows.map(this.mapRowToSession);
  },

  /**
   * Get session statistics for a chatbot
   */
  async getSessionStats(chatbotId: string): Promise<{
    total_sessions: number;
    active_sessions: number;
    avg_message_count: number;
    mode_distribution: Record<ConversationMode, number>;
  }> {
    const query = `
      SELECT
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE closed_at IS NULL) as active_sessions,
        AVG(message_count) as avg_message_count,
        COUNT(*) FILTER (WHERE conversation_mode = 'INFO_MODE') as info_mode,
        COUNT(*) FILTER (WHERE conversation_mode = 'INTENT_CHECK_MODE') as intent_check_mode,
        COUNT(*) FILTER (WHERE conversation_mode = 'LEAD_CAPTURE_MODE') as lead_capture_mode,
        COUNT(*) FILTER (WHERE conversation_mode = 'BOOKING_MODE') as booking_mode,
        COUNT(*) FILTER (WHERE conversation_mode = 'CLOSURE_MODE') as closure_mode
      FROM conversation_sessions
      WHERE chatbot_id = $1
    `;

    const result = await pool.query(query, [chatbotId]);
    const row = result.rows[0];

    return {
      total_sessions: parseInt(row.total_sessions) || 0,
      active_sessions: parseInt(row.active_sessions) || 0,
      avg_message_count: parseFloat(row.avg_message_count) || 0,
      mode_distribution: {
        INFO_MODE: parseInt(row.info_mode) || 0,
        INTENT_CHECK_MODE: parseInt(row.intent_check_mode) || 0,
        LEAD_CAPTURE_MODE: parseInt(row.lead_capture_mode) || 0,
        BOOKING_MODE: parseInt(row.booking_mode) || 0,
        CLOSURE_MODE: parseInt(row.closure_mode) || 0,
      },
    };
  },

  /**
   * Map database row to ConversationSession
   */
  mapRowToSession(row: any): ConversationSession {
    return {
      id: row.id,
      chatbot_id: row.chatbot_id,
      session_id: row.session_id,
      conversation_mode: row.conversation_mode,
      intent_level: row.intent_level,
      intent_signals: row.intent_signals || [],
      lead_capture_step: row.lead_capture_step,
      qualification_step: row.qualification_step || 0,
      qualification_answers: row.qualification_answers || {},
      page_url: row.page_url,
      referrer_url: row.referrer_url,
      user_agent: row.user_agent,
      user_ip: row.user_ip,
      message_history: row.message_history || [],
      message_count: row.message_count || 0,
      lead_id: row.lead_id,
      booking_status: row.booking_status,
      booking_link_clicked_at: row.booking_link_clicked_at,
      started_at: row.started_at,
      last_activity_at: row.last_activity_at,
      closed_at: row.closed_at,
    };
  },
};
