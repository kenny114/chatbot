/**
 * A/B Test Metrics Service
 * Tracks and analyzes performance metrics for agent vs state machine
 */

import pool from '../config/database';

export type Cohort = 'agent' | 'state_machine';

interface MetricsUpdate {
  response_time_ms: number;
  tool_calls?: number;
  had_error?: boolean;
  used_fallback?: boolean;
  lead_captured?: boolean;
  booking_offered?: boolean;
  booking_clicked?: boolean;
}

interface CohortMetrics {
  cohort: Cohort;
  total_conversations: number;
  total_messages: number;
  avg_response_time_ms: number;
  lead_capture_rate: number;
  booking_offer_rate: number;
  booking_click_rate: number;
  avg_messages_to_lead: number;
  avg_time_to_lead_seconds: number;
  error_rate: number;
  fallback_rate: number;
  avg_tool_calls: number;
  total_cost_usd: number;
  avg_cost_per_conversation_usd: number;
}

class ABTestMetricsService {
  /**
   * Initialize metrics for a new conversation session
   */
  async initializeSession(
    chatbotId: string,
    sessionId: string,
    cohort: Cohort,
    responseTimeMs: number,
    toolCalls: number = 0
  ): Promise<void> {
    const estimatedCost = this.estimateCost(cohort, 1, toolCalls);

    await pool.query(
      `INSERT INTO ab_test_metrics (
        chatbot_id,
        session_id,
        cohort,
        message_count,
        total_response_time_ms,
        avg_response_time_ms,
        total_tool_calls,
        estimated_cost_usd,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, 1, $4, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (session_id) DO NOTHING`,
      [chatbotId, sessionId, cohort, responseTimeMs, toolCalls, estimatedCost]
    );
  }

  /**
   * Update metrics for an existing conversation
   */
  async updateSession(
    sessionId: string,
    updates: MetricsUpdate
  ): Promise<void> {
    try {
      // Get existing metrics
      const existing = await pool.query(
        'SELECT * FROM ab_test_metrics WHERE session_id = $1',
        [sessionId]
      );

      if (existing.rows.length === 0) {
        console.warn(`[ABTestMetrics] No metrics found for session: ${sessionId}`);
        return;
      }

      const current = existing.rows[0];
      const newMessageCount = current.message_count + 1;
      const newTotalResponseTime = current.total_response_time_ms + updates.response_time_ms;
      const newAvgResponseTime = Math.round(newTotalResponseTime / newMessageCount);
      const newToolCalls = current.total_tool_calls + (updates.tool_calls || 0);
      const newErrors = current.agent_errors + (updates.had_error ? 1 : 0);

      // Calculate time to lead capture
      let leadCaptureTime = current.lead_capture_time_seconds;
      let leadCaptureMessageCount = current.lead_capture_message_count;
      if (updates.lead_captured && !current.lead_captured) {
        const firstMessageTime = new Date(current.created_at).getTime();
        const now = Date.now();
        leadCaptureTime = Math.round((now - firstMessageTime) / 1000);
        leadCaptureMessageCount = newMessageCount;
      }

      // Estimate additional cost
      const additionalCost = this.estimateCost(current.cohort, 1, updates.tool_calls || 0);
      const newTotalCost = current.estimated_cost_usd + additionalCost;

      await pool.query(
        `UPDATE ab_test_metrics
         SET
           message_count = $1,
           total_response_time_ms = $2,
           avg_response_time_ms = $3,
           total_tool_calls = $4,
           agent_errors = $5,
           fallback_used = CASE WHEN $6 THEN true ELSE fallback_used END,
           lead_captured = CASE WHEN $7 THEN true ELSE lead_captured END,
           lead_capture_time_seconds = COALESCE($8, lead_capture_time_seconds),
           lead_capture_message_count = COALESCE($9, lead_capture_message_count),
           booking_offered = CASE WHEN $10 THEN true ELSE booking_offered END,
           booking_clicked = CASE WHEN $11 THEN true ELSE booking_clicked END,
           estimated_cost_usd = $12,
           updated_at = NOW()
         WHERE session_id = $13`,
        [
          newMessageCount,
          newTotalResponseTime,
          newAvgResponseTime,
          newToolCalls,
          newErrors,
          updates.used_fallback || false,
          updates.lead_captured || false,
          leadCaptureTime,
          leadCaptureMessageCount,
          updates.booking_offered || false,
          updates.booking_clicked || false,
          newTotalCost,
          sessionId,
        ]
      );

    } catch (error) {
      console.error('[ABTestMetrics] Error updating session:', error);
    }
  }

  /**
   * Get comparative metrics for agent vs state machine
   */
  async getComparativeMetrics(
    chatbotId: string,
    daysBack: number = 7
  ): Promise<{
    agent: CohortMetrics | null;
    state_machine: CohortMetrics | null;
  }> {
    const result = await pool.query(
      `SELECT
        cohort,
        COUNT(DISTINCT session_id) as total_conversations,
        SUM(message_count) as total_messages,
        AVG(avg_response_time_ms)::int as avg_response_time_ms,
        AVG(CASE WHEN lead_captured THEN 1.0 ELSE 0.0 END) * 100 as lead_capture_rate,
        AVG(CASE WHEN booking_offered THEN 1.0 ELSE 0.0 END) * 100 as booking_offer_rate,
        AVG(CASE WHEN booking_clicked THEN 1.0 ELSE 0.0 END) * 100 as booking_click_rate,
        AVG(lead_capture_message_count) as avg_messages_to_lead,
        AVG(lead_capture_time_seconds) as avg_time_to_lead_seconds,
        AVG(CASE WHEN agent_errors > 0 THEN 1.0 ELSE 0.0 END) * 100 as error_rate,
        AVG(CASE WHEN fallback_used THEN 1.0 ELSE 0.0 END) * 100 as fallback_rate,
        AVG(total_tool_calls / NULLIF(message_count, 0)) as avg_tool_calls,
        SUM(estimated_cost_usd) as total_cost_usd,
        AVG(estimated_cost_usd) as avg_cost_per_conversation_usd
      FROM ab_test_metrics
      WHERE chatbot_id = $1
        AND created_at >= NOW() - INTERVAL '${daysBack} days'
      GROUP BY cohort`,
      [chatbotId]
    );

    const agentMetrics = result.rows.find(r => r.cohort === 'agent');
    const smMetrics = result.rows.find(r => r.cohort === 'state_machine');

    return {
      agent: agentMetrics ? this.formatMetrics(agentMetrics) : null,
      state_machine: smMetrics ? this.formatMetrics(smMetrics) : null,
    };
  }

  /**
   * Get all metrics across all chatbots
   */
  async getGlobalMetrics(daysBack: number = 7): Promise<{
    agent: CohortMetrics | null;
    state_machine: CohortMetrics | null;
  }> {
    const result = await pool.query(
      `SELECT
        cohort,
        COUNT(DISTINCT session_id) as total_conversations,
        SUM(message_count) as total_messages,
        AVG(avg_response_time_ms)::int as avg_response_time_ms,
        AVG(CASE WHEN lead_captured THEN 1.0 ELSE 0.0 END) * 100 as lead_capture_rate,
        AVG(CASE WHEN booking_offered THEN 1.0 ELSE 0.0 END) * 100 as booking_offer_rate,
        AVG(CASE WHEN booking_clicked THEN 1.0 ELSE 0.0 END) * 100 as booking_click_rate,
        AVG(lead_capture_message_count) as avg_messages_to_lead,
        AVG(lead_capture_time_seconds) as avg_time_to_lead_seconds,
        AVG(CASE WHEN agent_errors > 0 THEN 1.0 ELSE 0.0 END) * 100 as error_rate,
        AVG(CASE WHEN fallback_used THEN 1.0 ELSE 0.0 END) * 100 as fallback_rate,
        AVG(total_tool_calls / NULLIF(message_count, 0)) as avg_tool_calls,
        SUM(estimated_cost_usd) as total_cost_usd,
        AVG(estimated_cost_usd) as avg_cost_per_conversation_usd
      FROM ab_test_metrics
      WHERE created_at >= NOW() - INTERVAL '${daysBack} days'
      GROUP BY cohort`
    );

    const agentMetrics = result.rows.find(r => r.cohort === 'agent');
    const smMetrics = result.rows.find(r => r.cohort === 'state_machine');

    return {
      agent: agentMetrics ? this.formatMetrics(agentMetrics) : null,
      state_machine: smMetrics ? this.formatMetrics(smMetrics) : null,
    };
  }

  // Private methods

  /**
   * Format raw metrics into typed structure
   */
  private formatMetrics(raw: any): CohortMetrics {
    return {
      cohort: raw.cohort,
      total_conversations: parseInt(raw.total_conversations),
      total_messages: parseInt(raw.total_messages),
      avg_response_time_ms: parseInt(raw.avg_response_time_ms || '0'),
      lead_capture_rate: parseFloat(raw.lead_capture_rate || '0'),
      booking_offer_rate: parseFloat(raw.booking_offer_rate || '0'),
      booking_click_rate: parseFloat(raw.booking_click_rate || '0'),
      avg_messages_to_lead: parseFloat(raw.avg_messages_to_lead || '0'),
      avg_time_to_lead_seconds: parseFloat(raw.avg_time_to_lead_seconds || '0'),
      error_rate: parseFloat(raw.error_rate || '0'),
      fallback_rate: parseFloat(raw.fallback_rate || '0'),
      avg_tool_calls: parseFloat(raw.avg_tool_calls || '0'),
      total_cost_usd: parseFloat(raw.total_cost_usd || '0'),
      avg_cost_per_conversation_usd: parseFloat(raw.avg_cost_per_conversation_usd || '0'),
    };
  }

  /**
   * Estimate API cost for a conversation turn
   */
  private estimateCost(cohort: Cohort, messages: number, toolCalls: number): number {
    if (cohort === 'state_machine') {
      // State machine: Only RAG embedding lookup + GPT-4o-mini for response
      // Embedding: ~$0.0001 per 1K tokens (assume 200 tokens per message)
      // GPT-4o-mini: ~$0.00015 per 1K input tokens, ~$0.0006 per 1K output tokens
      const embeddingCost = (200 / 1000) * 0.0001;
      const inputCost = (500 / 1000) * 0.00015; // ~500 input tokens
      const outputCost = (200 / 1000) * 0.0006; // ~200 output tokens
      return messages * (embeddingCost + inputCost + outputCost);
    } else {
      // Agent: RAG + tool calls + reasoning
      // Base: Same as state machine
      const baseCost = (200 / 1000) * 0.0001 + (500 / 1000) * 0.00015 + (200 / 1000) * 0.0006;
      // Tool calls: Each tool adds context (assume 300 tokens per tool)
      const toolCost = toolCalls * ((300 / 1000) * 0.00015);
      // Agent reasoning overhead: ~2x the base cost
      return messages * (baseCost * 2 + toolCost);
    }
  }
}

export const abTestMetricsService = new ABTestMetricsService();
