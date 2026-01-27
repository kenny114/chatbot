/**
 * A/B Test Service
 * Manages cohort assignment for gradual agent rollout
 */

import pool from '../config/database';
import crypto from 'crypto';

export type Cohort = 'agent' | 'state_machine';

interface CohortAssignment {
  chatbot_id: string;
  cohort: Cohort;
  assigned_at: Date;
  is_manual: boolean;
}

class ABTestService {
  /**
   * Get rollout percentage from environment (0-100)
   */
  private getRolloutPercentage(): number {
    const percentage = parseInt(process.env.AGENT_ROLLOUT_PERCENTAGE || '0', 10);
    return Math.max(0, Math.min(100, percentage)); // Clamp to 0-100
  }

  /**
   * Check if chatbot is in agent cohort
   */
  async isInAgentCohort(chatbotId: string): Promise<boolean> {
    const cohort = await this.getCohort(chatbotId);
    return cohort === 'agent';
  }

  /**
   * Get cohort assignment for chatbot
   */
  async getCohort(chatbotId: string): Promise<Cohort> {
    // Check if there's a persisted assignment
    const existing = await this.getPersistedCohort(chatbotId);
    if (existing) {
      return existing.cohort;
    }

    // Calculate new assignment based on rollout percentage
    const rolloutPercentage = this.getRolloutPercentage();

    // Use deterministic hashing for consistent assignment
    const hash = this.hashChatbotId(chatbotId);
    const bucket = hash % 100; // 0-99

    const cohort: Cohort = bucket < rolloutPercentage ? 'agent' : 'state_machine';

    // Persist assignment
    await this.persistCohort(chatbotId, cohort, false);

    return cohort;
  }

  /**
   * Manually assign chatbot to cohort (for testing)
   */
  async assignCohort(chatbotId: string, cohort: Cohort): Promise<void> {
    await this.persistCohort(chatbotId, cohort, true);
    console.log(`[ABTest] Manually assigned chatbot ${chatbotId} to cohort: ${cohort}`);
  }

  /**
   * Remove cohort assignment (will be recalculated next time)
   */
  async removeCohortAssignment(chatbotId: string): Promise<void> {
    await pool.query(
      'DELETE FROM ab_test_cohorts WHERE chatbot_id = $1',
      [chatbotId]
    );
    console.log(`[ABTest] Removed cohort assignment for chatbot ${chatbotId}`);
  }

  /**
   * Get all cohort assignments
   */
  async getAllCohorts(): Promise<CohortAssignment[]> {
    const result = await pool.query(
      'SELECT * FROM ab_test_cohorts ORDER BY assigned_at DESC'
    );
    return result.rows;
  }

  /**
   * Get cohort statistics
   */
  async getCohortStats(): Promise<{
    total_chatbots: number;
    agent_cohort_count: number;
    state_machine_cohort_count: number;
    agent_percentage: number;
    manual_assignments: number;
  }> {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_chatbots,
        COUNT(*) FILTER (WHERE cohort = 'agent') as agent_cohort_count,
        COUNT(*) FILTER (WHERE cohort = 'state_machine') as state_machine_cohort_count,
        COUNT(*) FILTER (WHERE is_manual = true) as manual_assignments
      FROM ab_test_cohorts
    `);

    const row = result.rows[0];
    const total = parseInt(row.total_chatbots);
    const agentCount = parseInt(row.agent_cohort_count);

    return {
      total_chatbots: total,
      agent_cohort_count: agentCount,
      state_machine_cohort_count: parseInt(row.state_machine_cohort_count),
      agent_percentage: total > 0 ? (agentCount / total) * 100 : 0,
      manual_assignments: parseInt(row.manual_assignments),
    };
  }

  /**
   * Reset all cohort assignments (forces recalculation)
   */
  async resetAllCohorts(): Promise<void> {
    await pool.query('DELETE FROM ab_test_cohorts WHERE is_manual = false');
    console.log('[ABTest] Reset all automatic cohort assignments');
  }

  // Private methods

  /**
   * Get persisted cohort from database
   */
  private async getPersistedCohort(chatbotId: string): Promise<CohortAssignment | null> {
    const result = await pool.query(
      'SELECT * FROM ab_test_cohorts WHERE chatbot_id = $1',
      [chatbotId]
    );

    return result.rows[0] || null;
  }

  /**
   * Persist cohort assignment to database
   */
  private async persistCohort(
    chatbotId: string,
    cohort: Cohort,
    isManual: boolean
  ): Promise<void> {
    await pool.query(
      `INSERT INTO ab_test_cohorts (chatbot_id, cohort, is_manual, assigned_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (chatbot_id)
       DO UPDATE SET cohort = $2, is_manual = $3, assigned_at = NOW()`,
      [chatbotId, cohort, isManual]
    );
  }

  /**
   * Hash chatbot ID to consistent number (for deterministic assignment)
   */
  private hashChatbotId(chatbotId: string): number {
    const hash = crypto.createHash('sha256').update(chatbotId).digest('hex');
    return parseInt(hash.substring(0, 8), 16);
  }
}

export const abTestService = new ABTestService();
