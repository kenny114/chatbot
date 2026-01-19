import { Request, Response } from 'express';
import { chatbotService } from '../services/chatbotService';
import { ragService } from '../services/ragService';
import { analyticsService } from '../services/analyticsService';
import { customizationService } from '../services/customizationService';
import { asyncHandler } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export const handleChatQuery = asyncHandler(async (req: Request, res: Response) => {
  const { chatbotId } = req.params;
  const { message } = req.body;

  // Get chatbot (no user auth required for webhooks)
  const chatbot = await chatbotService.getChatbot(chatbotId);

  // Check if chatbot is ready
  if (chatbot.status !== 'ready') {
    res.status(503).json({
      error: 'Chatbot is not ready yet. Please try again later.',
      status: chatbot.status,
    });
    return;
  }

  // Track start time for response time measurement
  const startTime = Date.now();

  // Get customization settings for behavior
  const customization = await customizationService.getCustomization(chatbotId);
  const behaviorSettings = customization ? {
    tone: customization.responseTone,
    length: customization.responseLength,
    language: customization.language,
  } : undefined;

  // Generate response using RAG
  const { response, sources } = await ragService.generateResponse(
    chatbotId,
    message,
    chatbot.instructions,
    behaviorSettings
  );

  // Calculate response time
  const responseTimeMs = Date.now() - startTime;

  // Generate conversation ID
  const conversationId = uuidv4();

  // Track conversation for analytics (async, don't block response)
  analyticsService.trackConversation({
    chatbotId,
    userIdentifier: req.ip || 'anonymous',
    userIp: req.ip,
    userAgent: req.get('user-agent'),
    userMessage: message,
    botResponse: response,
    sourcesUsed: sources,
    responseTimeMs,
  }).catch((error) => {
    console.error('Error tracking analytics:', error);
    // Don't fail the request if analytics tracking fails
  });

  res.status(200).json({
    response,
    sources,
    conversationId,
  });
});
