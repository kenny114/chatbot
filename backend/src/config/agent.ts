/**
 * LangChain Agent Configuration
 * Centralized configuration for agent behavior, execution limits, and feature flags
 */

export const AGENT_CONFIG = {
  // =============================================================================
  // MODEL SETTINGS
  // =============================================================================
  MODEL: (process.env.AGENT_MODEL as 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4o') || 'gpt-4o-mini',
  TEMPERATURE: parseFloat(process.env.AGENT_TEMPERATURE || '0.7'),
  MAX_TOKENS: parseInt(process.env.AGENT_MAX_TOKENS || '1000', 10),

  // =============================================================================
  // EXECUTION LIMITS (Guardrails)
  // =============================================================================
  MAX_ITERATIONS: parseInt(process.env.AGENT_MAX_ITERATIONS || '5', 10), // Prevent infinite loops
  MAX_TOOL_RETRIES: parseInt(process.env.AGENT_MAX_TOOL_RETRIES || '3', 10),
  TIMEOUT_MS: parseInt(process.env.AGENT_TIMEOUT_MS || '15000', 10), // 15 second timeout

  // =============================================================================
  // MEMORY SETTINGS
  // =============================================================================
  CONVERSATION_WINDOW: parseInt(process.env.AGENT_CONVERSATION_WINDOW || '10', 10), // Last N messages
  SUMMARIZATION_THRESHOLD: parseInt(process.env.AGENT_SUMMARIZATION_THRESHOLD || '20', 10), // Messages before summarizing
  MAX_PROFILE_SUMMARIES: parseInt(process.env.AGENT_MAX_PROFILE_SUMMARIES || '5', 10), // Max summaries to store per visitor

  // =============================================================================
  // SAFETY SETTINGS
  // =============================================================================
  ENABLE_GUARDRAILS: process.env.AGENT_ENABLE_GUARDRAILS !== 'false', // Default: true
  ENABLE_FALLBACK: process.env.AGENT_ENABLE_FALLBACK !== 'false', // Default: true
  FALLBACK_TO_RAG_ON_ERROR: process.env.AGENT_FALLBACK_TO_RAG !== 'false', // Default: true
  TRACK_INTERMEDIATE_STEPS: process.env.NODE_ENV === 'development', // Log tool executions in dev

  // =============================================================================
  // FEATURE FLAGS
  // =============================================================================
  USE_AGENT: process.env.USE_LANGCHAIN_AGENT === 'true', // Main feature flag
  ENABLE_SHADOW_MODE: process.env.AGENT_SHADOW_MODE === 'true', // Run both systems in parallel
  AGENT_ROLLOUT_PERCENTAGE: parseInt(process.env.AGENT_ROLLOUT_PERCENTAGE || '0', 10), // 0-100 for A/B testing

  // Shadow Mode Configuration
  SHADOW_MODE_CHATBOTS: process.env.SHADOW_MODE_CHATBOTS?.split(',') || [], // Specific chatbot IDs for testing
  SHADOW_MODE_SAMPLE_RATE: parseFloat(process.env.SHADOW_MODE_SAMPLE_RATE || '1.0'), // 0.0-1.0 (100% default)

  // =============================================================================
  // TOOL-SPECIFIC SETTINGS
  // =============================================================================
  // RAG Tool
  USE_MULTI_QUERY: process.env.AGENT_USE_MULTI_QUERY === 'true', // Multi-query retrieval
  USE_RERANKING: process.env.AGENT_USE_RERANKING === 'true', // Cohere re-ranking (requires API key)
  RAG_TOP_K: parseInt(process.env.AGENT_RAG_TOP_K || '5', 10), // Number of chunks to retrieve

  // Intent Tool
  INTENT_CONFIDENCE_THRESHOLD: parseFloat(process.env.AGENT_INTENT_THRESHOLD || '0.5'),

  // Lead Capture Tool
  MIN_EXCHANGES_BEFORE_CAPTURE: parseInt(process.env.AGENT_MIN_EXCHANGES || '2', 10), // Minimum helpful exchanges

  // Visitor Profile Tool
  ENABLE_VISITOR_PROFILES: process.env.ENABLE_VISITOR_PROFILES !== 'false', // Default: true
  VISITOR_FINGERPRINT_SALT: process.env.VISITOR_FINGERPRINT_SALT || 'default-salt-change-me',

  // =============================================================================
  // PERFORMANCE SETTINGS
  // =============================================================================
  ENABLE_CACHING: process.env.AGENT_ENABLE_CACHING === 'true', // Response caching (future feature)
  PARALLEL_TOOL_EXECUTION: process.env.AGENT_PARALLEL_TOOLS !== 'false', // Default: true

  // =============================================================================
  // LOGGING & MONITORING
  // =============================================================================
  LOG_LEVEL: (process.env.AGENT_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  LOG_TOOL_CALLS: process.env.AGENT_LOG_TOOL_CALLS !== 'false', // Default: true
  LOG_REASONING: process.env.AGENT_LOG_REASONING === 'true',

  // =============================================================================
  // COST OPTIMIZATION
  // =============================================================================
  MAX_COST_PER_MESSAGE: parseFloat(process.env.AGENT_MAX_COST_PER_MESSAGE || '0.01'), // $0.01 max
  TRACK_TOKEN_USAGE: process.env.AGENT_TRACK_TOKENS !== 'false', // Default: true
};

/**
 * Validation function to check if config is valid
 */
export function validateAgentConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate numeric ranges
  if (AGENT_CONFIG.MAX_ITERATIONS < 1 || AGENT_CONFIG.MAX_ITERATIONS > 10) {
    errors.push('MAX_ITERATIONS must be between 1 and 10');
  }

  if (AGENT_CONFIG.TIMEOUT_MS < 1000 || AGENT_CONFIG.TIMEOUT_MS > 60000) {
    errors.push('TIMEOUT_MS must be between 1000 and 60000 (1-60 seconds)');
  }

  if (AGENT_CONFIG.TEMPERATURE < 0 || AGENT_CONFIG.TEMPERATURE > 2) {
    errors.push('TEMPERATURE must be between 0 and 2');
  }

  if (AGENT_CONFIG.AGENT_ROLLOUT_PERCENTAGE < 0 || AGENT_CONFIG.AGENT_ROLLOUT_PERCENTAGE > 100) {
    errors.push('AGENT_ROLLOUT_PERCENTAGE must be between 0 and 100');
  }

  // Validate model
  const validModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-4'];
  if (!validModels.includes(AGENT_CONFIG.MODEL)) {
    errors.push(`MODEL must be one of: ${validModels.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get agent config with runtime overrides
 */
export function getAgentConfig(overrides?: Partial<typeof AGENT_CONFIG>) {
  return {
    ...AGENT_CONFIG,
    ...overrides,
  };
}

/**
 * Check if agent should be used for a given chatbot
 */
export function shouldUseAgent(chatbotId: string): boolean {
  // Feature flag check
  if (!AGENT_CONFIG.USE_AGENT) {
    return false;
  }

  // If rollout percentage is 0, don't use agent
  if (AGENT_CONFIG.AGENT_ROLLOUT_PERCENTAGE === 0) {
    return false;
  }

  // If rollout percentage is 100, always use agent
  if (AGENT_CONFIG.AGENT_ROLLOUT_PERCENTAGE === 100) {
    return true;
  }

  // A/B test: hash chatbot ID to determine cohort
  const hash = simpleHash(chatbotId);
  const cohort = hash % 100;
  return cohort < AGENT_CONFIG.AGENT_ROLLOUT_PERCENTAGE;
}

/**
 * Simple hash function for consistent A/B testing
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Check if chatbot should be in shadow mode
 */
export function shouldUseShadowMode(chatbotId: string): boolean {
  // Shadow mode disabled globally
  if (!AGENT_CONFIG.ENABLE_SHADOW_MODE) {
    return false;
  }

  // If specific chatbots configured, only those are in shadow mode
  if (AGENT_CONFIG.SHADOW_MODE_CHATBOTS.length > 0) {
    return AGENT_CONFIG.SHADOW_MODE_CHATBOTS.includes(chatbotId);
  }

  // Sample rate (for random sampling)
  if (AGENT_CONFIG.SHADOW_MODE_SAMPLE_RATE < 1.0) {
    const hash = simpleHash(chatbotId);
    return (hash % 100) < (AGENT_CONFIG.SHADOW_MODE_SAMPLE_RATE * 100);
  }

  // Default: all chatbots in shadow mode when enabled
  return true;
}
