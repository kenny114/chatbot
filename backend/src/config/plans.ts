/**
 * Plan Constants and Feature Flags
 * Centralized configuration for subscription plan features and limits
 */

// Plan IDs - use these constants throughout the codebase
export const PLAN_IDS = {
  FREE: 'free',
  PRO: 'pro',
  CUSTOM: 'custom'
} as const;

export type PlanId = typeof PLAN_IDS[keyof typeof PLAN_IDS];

// Default plan for new users
export const DEFAULT_PLAN_ID = PLAN_IDS.FREE;

// Feature flags by plan
export const PLAN_FEATURES = {
  [PLAN_IDS.FREE]: {
    // Limits
    chatbot_limit: 1,
    message_limit: 0,           // No live messages
    preview_messages: 0,        // No preview testing

    // Features
    live_embed: false,
    lead_capture: false,
    branding_removal: false,
    business_hours: false,
    analytics_access: 'none' as const,

    // Capabilities
    website_scraping: true,
    document_upload: true,
    customization: true,
    industry_selection: true,
    tone_selection: true
  },

  [PLAN_IDS.PRO]: {
    // Limits
    chatbot_limit: 3,
    message_limit: -1,          // Unlimited
    preview_messages: -1,       // Unlimited

    // Features
    live_embed: true,
    lead_capture: true,
    branding_removal: true,
    business_hours: true,
    analytics_access: 'full' as const,

    // Capabilities
    website_scraping: true,
    document_upload: true,
    customization: true,
    industry_selection: true,
    tone_selection: true
  },

  [PLAN_IDS.CUSTOM]: {
    // Limits
    chatbot_limit: -1,          // Unlimited
    message_limit: -1,          // Unlimited
    preview_messages: -1,       // Unlimited

    // Features
    live_embed: true,
    lead_capture: true,
    branding_removal: true,
    business_hours: true,
    analytics_access: 'full' as const,

    // Capabilities
    website_scraping: true,
    document_upload: true,
    customization: true,
    industry_selection: true,
    tone_selection: true,

    // Custom-only features
    advanced_lead_qualification: true,
    phone_capture: true,
    calendar_booking: true,
    crm_integration: true,
    multi_channel: true,
    white_label: true,
    custom_workflows: true
  }
} as const;

// Lead qualification questions for Business+ plans
export const LEAD_QUALIFICATION_QUESTIONS = {
  permission: "Would you like us to follow up with you about this?",
  help_type: {
    question: "What type of help are you looking for?",
    options: ['Sales inquiry', 'Technical support', 'Setup assistance', 'Consultation']
  },
  challenge: "What challenge are you trying to solve?",
  contact: {
    name: "What's your name?",
    email: "What's your email address?"
  }
};

// Upgrade prompts
export const UPGRADE_PROMPTS = {
  live_embed: {
    title: "Ready to Go Live?",
    message: "Your assistant is ready. Publish it to your website to start capturing leads.",
    cta: "Upgrade to Pro"
  },
  lead_capture: {
    title: "Capture More Leads",
    message: "Upgrade to automatically qualify and capture leads from your website visitors.",
    cta: "Upgrade to Pro"
  },
  chatbot_limit: {
    title: "Need More Chatbots?",
    message: "You've reached your chatbot limit. Upgrade to create more AI assistants.",
    cta: "Upgrade to Pro"
  },
  message_limit: {
    title: "Message Limit Reached",
    message: "You've used all your preview messages this month. Upgrade for unlimited conversations.",
    cta: "Upgrade to Pro"
  }
};

// Helper function to check if a feature is available for a plan
export function hasFeature(planId: PlanId, feature: keyof typeof PLAN_FEATURES['free']): boolean {
  const planFeatures = PLAN_FEATURES[planId];
  if (!planFeatures) return false;

  const value = planFeatures[feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return true; // All string values (preview, full) are truthy
  return false;
}

// Helper function to get limit for a plan
export function getPlanLimit(planId: PlanId, limit: 'chatbot_limit' | 'message_limit' | 'preview_messages'): number {
  const planFeatures = PLAN_FEATURES[planId];
  if (!planFeatures) return 0;
  return planFeatures[limit];
}

// Helper to check if user is within limits
export function isWithinLimit(planId: PlanId, limit: 'chatbot_limit' | 'message_limit' | 'preview_messages', currentUsage: number): boolean {
  const planLimit = getPlanLimit(planId, limit);
  if (planLimit === -1) return true; // Unlimited
  return currentUsage < planLimit;
}
