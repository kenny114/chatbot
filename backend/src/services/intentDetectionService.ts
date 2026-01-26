import { IntentLevel, IntentDetectionResult } from '../types/leadCapture';

// Default intent keywords
const DEFAULT_INTENT_KEYWORDS = [
  'price', 'pricing', 'cost', 'quote', 'estimate',
  'call', 'book', 'talk', 'schedule', 'demo',
  'consultation', 'meeting', 'appointment',
  'buy', 'purchase', 'start', 'begin', 'ready',
  'contact', 'speak', 'discuss', 'help',
];

// High intent page patterns
const HIGH_INTENT_PAGE_PATTERNS = [
  '/pricing', '/prices', '/plans',
  '/contact', '/contact-us',
  '/book', '/booking', '/schedule',
  '/demo', '/request-demo',
  '/quote', '/get-quote',
  '/start', '/get-started',
  '/signup', '/sign-up', '/register',
];

// Signal thresholds for intent levels
const SIGNAL_THRESHOLDS = {
  HIGH_INTENT: 3,    // 3+ signals = high intent
  MEDIUM_INTENT: 1,  // 1-2 signals = medium intent
};

export const intentDetectionService = {
  /**
   * Detect intent from a user message
   */
  detectIntent(
    message: string,
    pageUrl: string = '',
    existingSignals: string[] = [],
    customKeywords: string[] = DEFAULT_INTENT_KEYWORDS,
    highIntentPages: string[] = []
  ): IntentDetectionResult {
    const normalizedMessage = message.toLowerCase();
    const normalizedPageUrl = pageUrl.toLowerCase();

    // Find keywords in message
    const keywordsFound = this.findKeywords(normalizedMessage, customKeywords);

    // Check page context
    const pageIntentBoost = this.checkPageIntent(normalizedPageUrl, highIntentPages);

    // Combine signals
    const newSignals = [
      ...keywordsFound.map(k => `keyword:${k}`),
      ...(pageIntentBoost ? ['page:high_intent'] : []),
    ];

    // Merge with existing signals (deduplicate)
    const allSignals = [...new Set([...existingSignals, ...newSignals])];

    // Calculate intent level
    const level = this.calculateIntentLevel(allSignals, pageIntentBoost);

    return {
      level,
      signals: allSignals,
      keywords_found: keywordsFound,
      page_intent_boost: pageIntentBoost,
    };
  },

  /**
   * Find intent keywords in a message
   */
  findKeywords(message: string, keywords: string[]): string[] {
    const found: string[] = [];
    const words = message.split(/\s+/);

    for (const keyword of keywords) {
      // Check for exact word match or partial match
      if (words.some(word => word.includes(keyword)) || message.includes(keyword)) {
        found.push(keyword);
      }
    }

    return [...new Set(found)]; // Deduplicate
  },

  /**
   * Check if the page URL indicates high intent
   */
  checkPageIntent(pageUrl: string, customHighIntentPages: string[]): boolean {
    const allPatterns = [...HIGH_INTENT_PAGE_PATTERNS, ...customHighIntentPages];

    for (const pattern of allPatterns) {
      if (pageUrl.includes(pattern.toLowerCase())) {
        return true;
      }
    }

    return false;
  },

  /**
   * Calculate intent level based on signals
   */
  calculateIntentLevel(signals: string[], pageBoost: boolean): IntentLevel {
    // Count unique keyword signals
    const keywordSignals = signals.filter(s => s.startsWith('keyword:')).length;

    // Calculate effective signal count
    let effectiveCount = keywordSignals;

    // Page boost adds weight
    if (pageBoost) {
      effectiveCount += 1;
    }

    // Determine level
    if (effectiveCount >= SIGNAL_THRESHOLDS.HIGH_INTENT) {
      return 'HIGH_INTENT';
    } else if (effectiveCount >= SIGNAL_THRESHOLDS.MEDIUM_INTENT) {
      return 'MEDIUM_INTENT';
    }

    return 'LOW_INTENT';
  },

  /**
   * Check if message contains explicit booking/call request
   */
  isExplicitBookingRequest(message: string): boolean {
    const explicitPatterns = [
      /\b(want|like|need)\s+to\s+(book|schedule|call|talk|speak)/i,
      /\b(can\s+i|i\s+want)\s+(book|schedule|call)/i,
      /\bschedule\s+a?\s*(call|meeting|demo)/i,
      /\bbook\s+a?\s*(call|meeting|appointment|demo)/i,
      /\btalk\s+to\s+(someone|a\s+person|sales)/i,
      /\bcontact\s+(you|someone|sales)/i,
    ];

    return explicitPatterns.some(pattern => pattern.test(message));
  },

  /**
   * Check if message contains explicit pricing/quote request
   */
  isPricingRequest(message: string): boolean {
    const pricingPatterns = [
      /\b(what|how\s+much)\s+(is|are|does|do)\s+(the\s+)?(price|cost|pricing)/i,
      /\b(price|pricing|cost)\s+(for|of)/i,
      /\bget\s+a?\s*quote/i,
      /\bhow\s+much\s+(do\s+you|does\s+it)\s+cost/i,
      /\bpricing\s+(details|information|info)/i,
    ];

    return pricingPatterns.some(pattern => pattern.test(message));
  },

  /**
   * Analyze message sentiment for purchase readiness
   */
  analyzeReadiness(message: string): {
    isReady: boolean;
    indicators: string[];
  } {
    const readinessIndicators: string[] = [];

    // Time-sensitive indicators
    if (/\b(asap|soon|today|tomorrow|this\s+week|urgent)/i.test(message)) {
      readinessIndicators.push('time_sensitive');
    }

    // Commitment indicators
    if (/\b(ready\s+to|want\s+to|looking\s+to|need\s+to)\s+(start|begin|buy|purchase|sign\s+up)/i.test(message)) {
      readinessIndicators.push('commitment_language');
    }

    // Comparison indicators (might be shopping around)
    if (/\b(compare|vs|versus|alternative|competitor)/i.test(message)) {
      readinessIndicators.push('comparison_shopping');
    }

    // Budget indicators
    if (/\b(budget|afford|investment|roi)/i.test(message)) {
      readinessIndicators.push('budget_aware');
    }

    return {
      isReady: readinessIndicators.includes('commitment_language') || readinessIndicators.includes('time_sensitive'),
      indicators: readinessIndicators,
    };
  },

  /**
   * Get a human-readable intent summary
   */
  getIntentSummary(result: IntentDetectionResult): string {
    const levelDescriptions: Record<IntentLevel, string> = {
      LOW_INTENT: 'Browsing/exploring',
      MEDIUM_INTENT: 'Researching/interested',
      HIGH_INTENT: 'Ready to engage',
    };

    let summary = levelDescriptions[result.level];

    if (result.keywords_found.length > 0) {
      summary += ` (keywords: ${result.keywords_found.join(', ')})`;
    }

    if (result.page_intent_boost) {
      summary += ' [high-intent page]';
    }

    return summary;
  },
};
