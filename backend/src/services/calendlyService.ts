import { Lead, CalendlyBookingLink } from '../types/leadCapture';

export const calendlyService = {
  /**
   * Generate a Calendly booking link with prefilled data
   * Calendly supports prefilling via URL parameters:
   * - name: Prefill visitor name
   * - email: Prefill visitor email
   * - a1: Custom question answer 1
   * - a2: Custom question answer 2
   */
  generateBookingLink(
    baseUrl: string,
    leadData?: Partial<Lead>
  ): CalendlyBookingLink {
    // Clean the base URL (remove trailing slashes, ensure no existing params)
    let cleanUrl = baseUrl.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }

    // Build prefill parameters
    const params = new URLSearchParams();
    const prefillParams: { name?: string; email?: string } = {};

    if (leadData?.name) {
      params.append('name', leadData.name);
      prefillParams.name = leadData.name;
    }

    if (leadData?.email) {
      params.append('email', leadData.email);
      prefillParams.email = leadData.email;
    }

    // Add reason as custom answer if available
    if (leadData?.reason_for_interest) {
      params.append('a1', leadData.reason_for_interest);
    }

    // Build the final URL
    const queryString = params.toString();
    const prefilledUrl = queryString ? `${cleanUrl}?${queryString}` : cleanUrl;

    return {
      base_url: cleanUrl,
      prefilled_url: prefilledUrl,
      prefill_params: prefillParams,
    };
  },

  /**
   * Validate a Calendly URL
   */
  isValidCalendlyUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      // Check if it's a Calendly domain
      return parsed.hostname.includes('calendly.com') ||
             parsed.hostname.includes('cal.com'); // Also support Cal.com as alternative
    } catch {
      return false;
    }
  },

  /**
   * Extract event type from Calendly URL
   * e.g., https://calendly.com/username/30min -> 30min
   */
  extractEventType(url: string): string | null {
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        return pathParts[pathParts.length - 1];
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Build a tracking URL that includes our callback
   * This is useful if you want to track when someone clicks the booking link
   */
  buildTrackableBookingLink(
    baseUrl: string,
    leadData?: Partial<Lead>,
    trackingId?: string
  ): string {
    const bookingLink = this.generateBookingLink(baseUrl, leadData);

    if (trackingId) {
      const url = new URL(bookingLink.prefilled_url);
      url.searchParams.append('utm_source', 'chatbot');
      url.searchParams.append('utm_medium', 'widget');
      url.searchParams.append('utm_campaign', trackingId);
      return url.toString();
    }

    return bookingLink.prefilled_url;
  },

  /**
   * Get embed URL for iframe embedding (if ever needed in future)
   * Note: Current implementation uses new tab, but this is here for completeness
   */
  getEmbedUrl(baseUrl: string): string {
    const cleanUrl = baseUrl.trim().replace(/\/$/, '');
    // Calendly embed URLs can have specific parameters
    return `${cleanUrl}?embed_domain=widget&embed_type=PopupWidget`;
  },

  /**
   * Parse Calendly webhook payload (for future webhook integration)
   * This is here for when you upgrade to Calendly paid plan with webhooks
   */
  parseWebhookPayload(payload: any): {
    eventType: string;
    inviteeEmail: string;
    inviteeName: string;
    eventStartTime: Date;
    eventEndTime: Date;
    eventUri: string;
  } | null {
    try {
      const event = payload.event || payload;
      const invitee = payload.payload?.invitee || payload.invitee || {};

      return {
        eventType: event.event_type || 'scheduled',
        inviteeEmail: invitee.email || '',
        inviteeName: invitee.name || '',
        eventStartTime: new Date(event.start_time || payload.payload?.scheduled_event?.start_time),
        eventEndTime: new Date(event.end_time || payload.payload?.scheduled_event?.end_time),
        eventUri: event.uri || payload.payload?.scheduled_event?.uri || '',
      };
    } catch (error) {
      console.error('Error parsing Calendly webhook:', error);
      return null;
    }
  },
};
