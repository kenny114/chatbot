import { Request, Response } from 'express';
import { leadCaptureService } from '../services/leadCaptureService';
import { chatbotService } from '../services/chatbotService';
import { customizationService } from '../services/customizationService';
import { asyncHandler } from '../middleware/errorHandler';
import pool from '../config/database';

/**
 * Get all leads for the authenticated user
 */
export const getLeads = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { chatbot_id, limit, offset, start_date, end_date, intent_level, booking_status } = req.query;

  const options: any = {
    limit: limit ? parseInt(limit as string) : 50,
    offset: offset ? parseInt(offset as string) : 0,
  };

  if (chatbot_id) {
    options.chatbotId = chatbot_id as string;
  }

  const result = await leadCaptureService.getLeadsByUser(userId, options);

  res.status(200).json({
    leads: result.leads,
    total: result.total,
    limit: options.limit,
    offset: options.offset,
  });
});

/**
 * Get leads for a specific chatbot
 */
export const getLeadsByChatbot = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id: chatbotId } = req.params;
  const { limit, offset, start_date, end_date, intent_level, booking_status } = req.query;

  // Verify ownership
  const chatbot = await chatbotService.getChatbot(chatbotId);
  if (chatbot.user_id !== userId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const options: any = {
    limit: limit ? parseInt(limit as string) : 50,
    offset: offset ? parseInt(offset as string) : 0,
  };

  if (start_date) options.startDate = new Date(start_date as string);
  if (end_date) options.endDate = new Date(end_date as string);
  if (intent_level) options.intentLevel = intent_level as string;
  if (booking_status) options.bookingStatus = booking_status as string;

  const result = await leadCaptureService.getLeadsByChatbot(chatbotId, options);

  res.status(200).json({
    leads: result.leads,
    total: result.total,
    limit: options.limit,
    offset: options.offset,
  });
});

/**
 * Get a single lead
 */
export const getLead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { leadId } = req.params;

  const lead = await leadCaptureService.getLeadById(leadId);

  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  // Verify ownership via chatbot
  const chatbot = await chatbotService.getChatbot(lead.chatbot_id);
  if (chatbot.user_id !== userId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  res.status(200).json(lead);
});

/**
 * Delete a lead
 */
export const deleteLead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { leadId } = req.params;

  const lead = await leadCaptureService.getLeadById(leadId);

  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  // Verify ownership via chatbot
  const chatbot = await chatbotService.getChatbot(lead.chatbot_id);
  if (chatbot.user_id !== userId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  await leadCaptureService.deleteLead(leadId);

  res.status(200).json({ success: true });
});

/**
 * Get lead analytics for a chatbot
 */
export const getLeadAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id: chatbotId } = req.params;

  // Verify ownership
  const chatbot = await chatbotService.getChatbot(chatbotId);
  if (chatbot.user_id !== userId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const analytics = await leadCaptureService.getLeadAnalytics(chatbotId);

  res.status(200).json(analytics);
});

/**
 * Get lead capture configuration for a chatbot
 */
export const getLeadConfig = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id: chatbotId } = req.params;

  // Verify ownership
  const chatbot = await chatbotService.getChatbot(chatbotId);
  if (chatbot.user_id !== userId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // Get lead capture config from customization table
  const query = `
    SELECT
      lead_capture_enabled, lead_capture_trigger, require_name, require_reason,
      booking_enabled, booking_link, booking_cta_text,
      notification_email, notification_webhook_url, notify_on_lead, notify_on_booking,
      intent_keywords, high_intent_pages, qualification_enabled, qualification_questions,
      closure_message, booking_confirmation_message
    FROM chatbot_customization
    WHERE chatbot_id = $1
  `;

  const result = await pool.query(query, [chatbotId]);

  if (result.rows.length === 0) {
    // Return defaults
    res.status(200).json({
      lead_capture_enabled: false,
      lead_capture_trigger: 'MEDIUM_INTENT',
      require_name: false,
      require_reason: false,
      booking_enabled: false,
      booking_link: null,
      booking_cta_text: 'Book a Call',
      notification_email: null,
      notification_webhook_url: null,
      notify_on_lead: true,
      notify_on_booking: true,
      intent_keywords: ['price', 'cost', 'quote', 'call', 'book', 'talk', 'schedule', 'demo'],
      high_intent_pages: [],
      qualification_enabled: false,
      qualification_questions: [],
      closure_message: 'Thank you! Someone from our team will follow up shortly.',
      booking_confirmation_message: 'Great! Your call has been scheduled.',
    });
    return;
  }

  res.status(200).json(result.rows[0]);
});

/**
 * Update lead capture configuration for a chatbot
 */
export const updateLeadConfig = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id: chatbotId } = req.params;
  const config = req.body;

  // Verify ownership
  const chatbot = await chatbotService.getChatbot(chatbotId);
  if (chatbot.user_id !== userId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // Build update query dynamically
  const allowedFields = [
    'lead_capture_enabled', 'lead_capture_trigger', 'require_name', 'require_reason',
    'booking_enabled', 'booking_link', 'booking_cta_text',
    'notification_email', 'notification_webhook_url', 'notify_on_lead', 'notify_on_booking',
    'intent_keywords', 'high_intent_pages', 'qualification_enabled', 'qualification_questions',
    'closure_message', 'booking_confirmation_message',
  ];

  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  for (const field of allowedFields) {
    if (config[field] !== undefined) {
      updates.push(`${field} = $${paramCount}`);
      // Handle JSON fields
      if (['intent_keywords', 'high_intent_pages', 'qualification_questions'].includes(field)) {
        values.push(JSON.stringify(config[field]));
      } else {
        values.push(config[field]);
      }
      paramCount++;
    }
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  values.push(chatbotId);

  const query = `
    UPDATE chatbot_customization
    SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE chatbot_id = $${paramCount}
    RETURNING *
  `;

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    // Create customization record if it doesn't exist
    await customizationService.createDefaultCustomization(chatbotId);
    // Retry update
    const retryResult = await pool.query(query, values);
    res.status(200).json(retryResult.rows[0]);
    return;
  }

  res.status(200).json(result.rows[0]);
});

/**
 * Export leads as CSV
 */
export const exportLeads = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id: chatbotId } = req.params;

  // Verify ownership
  const chatbot = await chatbotService.getChatbot(chatbotId);
  if (chatbot.user_id !== userId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // Get all leads
  const result = await leadCaptureService.getLeadsByChatbot(chatbotId, { limit: 10000 });

  // Build CSV
  const headers = ['Email', 'Name', 'Phone', 'Interest', 'Intent Level', 'Booking Status', 'Page URL', 'Created At'];
  const rows = result.leads.map(lead => [
    lead.email,
    lead.name || '',
    lead.phone || '',
    lead.reason_for_interest || '',
    lead.intent_level || '',
    lead.booking_status || '',
    lead.page_url || '',
    new Date(lead.created_at).toISOString(),
  ]);

  const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="leads-${chatbotId}-${new Date().toISOString().split('T')[0]}.csv"`);
  res.status(200).send(csv);
});
