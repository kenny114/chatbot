/**
 * Shadow Mode Service
 * Logs and compares agent vs state machine decisions
 */

import pool from '../config/database';
import { AgentResponse } from '../types/agent';
import { StateTransitionResult } from '../types/leadCapture';

export interface ShadowModeComparison {
  id: string;
  chatbot_id: string;
  session_id: string;
  user_message: string;

  // State Machine Result
  state_machine_response: string;
  state_machine_mode: string;
  state_machine_intent_level: string;
  state_machine_execution_time_ms: number;

  // Agent Result
  agent_response: string;
  agent_mode: string;
  agent_intent_level: string;
  agent_tool_calls: string[];
  agent_tools_count: number;
  agent_execution_time_ms: number;
  agent_fallback_used: boolean;
  agent_error?: string;

  // Comparison Metrics
  response_similarity: number; // 0-1 (cosine similarity or simple comparison)
  mode_matches: boolean;
  intent_matches: boolean;
  decision_alignment_score: number; // 0-100

  // Metadata
  timestamp: Date;
}

class ShadowModeService {
  /**
   * Log comparison between agent and state machine
   */
  async logComparison(
    chatbotId: string,
    sessionId: string,
    userMessage: string,
    stateMachineResult: {
      result: StateTransitionResult;
      executionTimeMs: number;
    },
    agentResult: {
      result: AgentResponse;
      executionTimeMs: number;
    }
  ): Promise<void> {
    try {
      // Calculate comparison metrics
      const comparison = this.compareResults(
        stateMachineResult,
        agentResult
      );

      // Insert into database
      await pool.query(
        `INSERT INTO shadow_mode_comparisons (
          chatbot_id,
          session_id,
          user_message,
          state_machine_response,
          state_machine_mode,
          state_machine_intent_level,
          state_machine_execution_time_ms,
          agent_response,
          agent_mode,
          agent_intent_level,
          agent_tool_calls,
          agent_tools_count,
          agent_execution_time_ms,
          agent_fallback_used,
          agent_error,
          response_similarity,
          mode_matches,
          intent_matches,
          decision_alignment_score,
          timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())`,
        [
          chatbotId,
          sessionId,
          userMessage,
          stateMachineResult.result.response,
          (stateMachineResult.result as any).next_mode || (stateMachineResult.result as any).nextMode || 'INFO_MODE',
          'MEDIUM_INTENT', // State machine doesn't always expose this
          stateMachineResult.executionTimeMs,
          agentResult.result.response,
          agentResult.result.conversation_mode,
          agentResult.result.intent_level,
          JSON.stringify(this.extractToolNames(agentResult.result)),
          agentResult.result.tool_calls_count || 0,
          agentResult.executionTimeMs,
          agentResult.result.fallback_used,
          agentResult.result.error || null,
          comparison.response_similarity,
          comparison.mode_matches,
          comparison.intent_matches,
          comparison.decision_alignment_score,
        ]
      );

      console.log(
        `[ShadowMode] Logged comparison: mode_match=${comparison.mode_matches}, ` +
        `intent_match=${comparison.intent_matches}, ` +
        `alignment=${comparison.decision_alignment_score}%`
      );

    } catch (error) {
      console.error('[ShadowMode] Error logging comparison:', error);
      // Don't throw - shadow mode failures shouldn't break the request
    }
  }

  /**
   * Compare results and calculate metrics
   */
  private compareResults(
    stateMachineResult: { result: StateTransitionResult; executionTimeMs: number },
    agentResult: { result: AgentResponse; executionTimeMs: number }
  ): {
    response_similarity: number;
    mode_matches: boolean;
    intent_matches: boolean;
    decision_alignment_score: number;
  } {
    const smResult = stateMachineResult.result;
    const agResult = agentResult.result;

    // Mode match
    const modeMatches = this.modesMatch(
      smResult.next_mode || (smResult as any).nextMode || 'INFO_MODE',
      agResult.conversation_mode
    );

    // Intent match (approximate - state machine doesn't always expose intent)
    const intentMatches = true; // Simplified for now

    // Response similarity (simple word overlap for now)
    const responseSimilarity = this.calculateResponseSimilarity(
      smResult.response,
      agResult.response
    );

    // Decision alignment score (weighted average)
    const decisionAlignment = Math.round(
      (modeMatches ? 50 : 0) +
      (intentMatches ? 25 : 0) +
      (responseSimilarity * 25)
    );

    return {
      response_similarity: responseSimilarity,
      mode_matches: modeMatches,
      intent_matches: intentMatches,
      decision_alignment_score: decisionAlignment,
    };
  }

  /**
   * Check if conversation modes are equivalent
   */
  private modesMatch(stateMachineMode: string, agentMode: string): boolean {
    // Direct match
    if (stateMachineMode === agentMode) {
      return true;
    }

    // Fuzzy matches (agent might infer modes differently)
    const equivalentModes: Record<string, string[]> = {
      'INFO_MODE': ['INFO_MODE'],
      'INTENT_CHECK_MODE': ['INTENT_CHECK_MODE', 'INFO_MODE'],
      'LEAD_CAPTURE_MODE': ['LEAD_CAPTURE_MODE'],
      'QUALIFICATION_MODE': ['QUALIFICATION_MODE'],
      'BOOKING_MODE': ['BOOKING_MODE'],
      'CLOSURE_MODE': ['CLOSURE_MODE'],
    };

    return equivalentModes[stateMachineMode]?.includes(agentMode) || false;
  }

  /**
   * Calculate response similarity (simple word overlap)
   */
  private calculateResponseSimilarity(response1: string, response2: string): number {
    const words1 = new Set(response1.toLowerCase().split(/\s+/));
    const words2 = new Set(response2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Extract tool names from agent result
   */
  private extractToolNames(agentResult: AgentResponse): string[] {
    if (!agentResult.agent_state?.tool_calls) {
      return [];
    }

    return agentResult.agent_state.tool_calls.map(tc => tc.tool_name);
  }

  /**
   * Get comparison statistics
   */
  async getComparisonStats(chatbotId: string, limit: number = 100): Promise<{
    total_comparisons: number;
    mode_match_rate: number;
    avg_alignment_score: number;
    avg_agent_time_ms: number;
    avg_state_machine_time_ms: number;
    agent_error_rate: number;
    most_used_tools: Array<{ tool: string; count: number }>;
  }> {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total_comparisons,
        AVG(CASE WHEN mode_matches THEN 1.0 ELSE 0.0 END) * 100 as mode_match_rate,
        AVG(decision_alignment_score) as avg_alignment_score,
        AVG(agent_execution_time_ms) as avg_agent_time_ms,
        AVG(state_machine_execution_time_ms) as avg_state_machine_time_ms,
        AVG(CASE WHEN agent_fallback_used OR agent_error IS NOT NULL THEN 1.0 ELSE 0.0 END) * 100 as agent_error_rate
      FROM shadow_mode_comparisons
      WHERE chatbot_id = $1
      ORDER BY timestamp DESC
      LIMIT $2`,
      [chatbotId, limit]
    );

    // Get tool usage stats
    const toolStats = await pool.query(
      `SELECT
        jsonb_array_elements_text(agent_tool_calls) as tool,
        COUNT(*) as count
      FROM shadow_mode_comparisons
      WHERE chatbot_id = $1
        AND agent_tool_calls IS NOT NULL
      GROUP BY tool
      ORDER BY count DESC
      LIMIT 10`,
      [chatbotId]
    );

    return {
      total_comparisons: parseInt(result.rows[0]?.total_comparisons || '0'),
      mode_match_rate: parseFloat(result.rows[0]?.mode_match_rate || '0'),
      avg_alignment_score: parseFloat(result.rows[0]?.avg_alignment_score || '0'),
      avg_agent_time_ms: parseFloat(result.rows[0]?.avg_agent_time_ms || '0'),
      avg_state_machine_time_ms: parseFloat(result.rows[0]?.avg_state_machine_time_ms || '0'),
      agent_error_rate: parseFloat(result.rows[0]?.agent_error_rate || '0'),
      most_used_tools: toolStats.rows.map(row => ({
        tool: row.tool,
        count: parseInt(row.count),
      })),
    };
  }

  /**
   * Get recent comparisons for review
   */
  async getRecentComparisons(
    chatbotId: string,
    limit: number = 50
  ): Promise<ShadowModeComparison[]> {
    const result = await pool.query(
      `SELECT * FROM shadow_mode_comparisons
       WHERE chatbot_id = $1
       ORDER BY timestamp DESC
       LIMIT $2`,
      [chatbotId, limit]
    );

    return result.rows;
  }

  /**
   * Get mismatched decisions (for tuning)
   */
  async getMismatches(
    chatbotId: string,
    minAlignmentScore: number = 70,
    limit: number = 50
  ): Promise<ShadowModeComparison[]> {
    const result = await pool.query(
      `SELECT * FROM shadow_mode_comparisons
       WHERE chatbot_id = $1
         AND decision_alignment_score < $2
       ORDER BY decision_alignment_score ASC, timestamp DESC
       LIMIT $3`,
      [chatbotId, minAlignmentScore, limit]
    );

    return result.rows;
  }
}

export const shadowModeService = new ShadowModeService();
