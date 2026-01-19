import pool from '../config/database';

interface AnalyticsOverview {
  totalMessages: number;
  uniqueUsers: number;
  avgResponseTime: number;
  satisfactionRate: number;
  trend: {
    messages: number;
    users: number;
    responseTime: number;
    satisfaction: number;
  };
}

interface MessageData {
  date: string;
  messages: number;
}

interface PopularQuestion {
  question: string;
  count: number;
  avgResponseTime: number;
  avgRating: number | null;
}

interface ResponseTimeData {
  hour: string;
  avgTime: number;
}

interface RecentConversation {
  id: string;
  userIdentifier: string;
  userMessage: string;
  botResponse: string;
  chatbotId: string;
  satisfactionRating: number | null;
  createdAt: Date;
}

export const analyticsService = {
  /**
   * Get analytics overview for a user's chatbots
   */
  async getOverview(userId: string, chatbotId?: string, timeRange: string = '7d'): Promise<AnalyticsOverview> {
    const days = parseInt(timeRange.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = `
      SELECT
        COUNT(*) as total_messages,
        COUNT(DISTINCT user_identifier) as unique_users,
        AVG(response_time_ms) as avg_response_time,
        AVG(CASE WHEN satisfaction_rating IS NOT NULL THEN satisfaction_rating END) as avg_satisfaction
      FROM conversation_analytics ca
      JOIN chatbots c ON ca.chatbot_id = c.id
      WHERE c.user_id = $1
        AND ca.created_at >= $2
        ${chatbotId ? 'AND ca.chatbot_id = $3' : ''}
    `;

    const params = chatbotId ? [userId, startDate, chatbotId] : [userId, startDate];
    const result = await pool.query(query, params);

    // Get previous period for trend calculation
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    const prevQuery = `
      SELECT
        COUNT(*) as total_messages,
        COUNT(DISTINCT user_identifier) as unique_users,
        AVG(response_time_ms) as avg_response_time,
        AVG(CASE WHEN satisfaction_rating IS NOT NULL THEN satisfaction_rating END) as avg_satisfaction
      FROM conversation_analytics ca
      JOIN chatbots c ON ca.chatbot_id = c.id
      WHERE c.user_id = $1
        AND ca.created_at >= $2
        AND ca.created_at < $3
        ${chatbotId ? 'AND ca.chatbot_id = $4' : ''}
    `;

    const prevParams = chatbotId
      ? [userId, prevStartDate, startDate, chatbotId]
      : [userId, prevStartDate, startDate];
    const prevResult = await pool.query(prevQuery, prevParams);

    const current = result.rows[0];
    const previous = prevResult.rows[0];

    const calculateTrend = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    return {
      totalMessages: parseInt(current.total_messages) || 0,
      uniqueUsers: parseInt(current.unique_users) || 0,
      avgResponseTime: parseFloat(current.avg_response_time) || 0,
      satisfactionRate: parseFloat(current.avg_satisfaction) || 0,
      trend: {
        messages: calculateTrend(current.total_messages, previous.total_messages),
        users: calculateTrend(current.unique_users, previous.unique_users),
        responseTime: -calculateTrend(current.avg_response_time, previous.avg_response_time), // Negative because lower is better
        satisfaction: calculateTrend(current.avg_satisfaction, previous.avg_satisfaction),
      },
    };
  },

  /**
   * Get messages over time
   */
  async getMessagesOverTime(userId: string, chatbotId?: string, timeRange: string = '7d'): Promise<MessageData[]> {
    const days = parseInt(timeRange.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = `
      SELECT
        DATE(ca.created_at) as date,
        COUNT(*) as messages
      FROM conversation_analytics ca
      JOIN chatbots c ON ca.chatbot_id = c.id
      WHERE c.user_id = $1
        AND ca.created_at >= $2
        ${chatbotId ? 'AND ca.chatbot_id = $3' : ''}
      GROUP BY DATE(ca.created_at)
      ORDER BY date ASC
    `;

    const params = chatbotId ? [userId, startDate, chatbotId] : [userId, startDate];
    const result = await pool.query(query, params);

    return result.rows.map(row => ({
      date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      messages: parseInt(row.messages),
    }));
  },

  /**
   * Get popular questions
   */
  async getPopularQuestions(userId: string, chatbotId?: string, limit: number = 10): Promise<PopularQuestion[]> {
    const query = `
      SELECT
        user_message as question,
        COUNT(*) as count,
        AVG(response_time_ms) as avg_response_time,
        AVG(satisfaction_rating) as avg_rating
      FROM conversation_analytics ca
      JOIN chatbots c ON ca.chatbot_id = c.id
      WHERE c.user_id = $1
        ${chatbotId ? 'AND ca.chatbot_id = $2' : ''}
      GROUP BY user_message
      ORDER BY count DESC
      LIMIT ${limit}
    `;

    const params = chatbotId ? [userId, chatbotId] : [userId];
    const result = await pool.query(query, params);

    return result.rows.map(row => ({
      question: row.question,
      count: parseInt(row.count),
      avgResponseTime: parseFloat(row.avg_response_time) || 0,
      avgRating: row.avg_rating ? parseFloat(row.avg_rating) : null,
    }));
  },

  /**
   * Get response times by hour
   */
  async getResponseTimesByHour(userId: string, chatbotId?: string): Promise<ResponseTimeData[]> {
    const query = `
      SELECT
        EXTRACT(HOUR FROM ca.created_at) as hour,
        AVG(response_time_ms) as avg_time
      FROM conversation_analytics ca
      JOIN chatbots c ON ca.chatbot_id = c.id
      WHERE c.user_id = $1
        ${chatbotId ? 'AND ca.chatbot_id = $2' : ''}
      GROUP BY EXTRACT(HOUR FROM ca.created_at)
      ORDER BY hour ASC
    `;

    const params = chatbotId ? [userId, chatbotId] : [userId];
    const result = await pool.query(query, params);

    return result.rows.map(row => ({
      hour: `${row.hour}:00`,
      avgTime: parseFloat(row.avg_time) / 1000, // Convert to seconds
    }));
  },

  /**
   * Get recent conversations
   */
  async getRecentConversations(userId: string, chatbotId?: string, limit: number = 20): Promise<RecentConversation[]> {
    const query = `
      SELECT
        ca.id,
        ca.user_identifier,
        ca.user_message,
        ca.bot_response,
        ca.chatbot_id,
        ca.satisfaction_rating,
        ca.created_at
      FROM conversation_analytics ca
      JOIN chatbots c ON ca.chatbot_id = c.id
      WHERE c.user_id = $1
        ${chatbotId ? 'AND ca.chatbot_id = $2' : ''}
      ORDER BY ca.created_at DESC
      LIMIT ${limit}
    `;

    const params = chatbotId ? [userId, chatbotId] : [userId];
    const result = await pool.query(query, params);

    return result.rows.map(row => ({
      id: row.id,
      userIdentifier: row.user_identifier,
      userMessage: row.user_message,
      botResponse: row.bot_response,
      chatbotId: row.chatbot_id,
      satisfactionRating: row.satisfaction_rating,
      createdAt: row.created_at,
    }));
  },

  /**
   * Track a conversation for analytics
   */
  async trackConversation(data: {
    chatbotId: string;
    userIdentifier?: string;
    userIp?: string;
    userAgent?: string;
    userMessage: string;
    botResponse: string;
    sourcesUsed?: any[];
    responseTimeMs: number;
    tokensUsed?: number;
  }): Promise<void> {
    const query = `
      INSERT INTO conversation_analytics (
        chatbot_id,
        user_identifier,
        user_ip,
        user_agent,
        user_message,
        bot_response,
        sources_used,
        response_time_ms,
        tokens_used
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    await pool.query(query, [
      data.chatbotId,
      data.userIdentifier || 'anonymous',
      data.userIp,
      data.userAgent,
      data.userMessage,
      data.botResponse,
      data.sourcesUsed ? JSON.stringify(data.sourcesUsed) : null,
      data.responseTimeMs,
      data.tokensUsed,
    ]);
  },

  /**
   * Record satisfaction rating
   */
  async recordSatisfaction(conversationId: string, rating: number, feedback?: string): Promise<void> {
    const query = `
      UPDATE conversation_analytics
      SET satisfaction_rating = $1,
          feedback_text = $2
      WHERE id = $3
    `;

    await pool.query(query, [rating, feedback, conversationId]);
  },
};
