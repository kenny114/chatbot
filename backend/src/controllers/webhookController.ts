import { Request, Response } from 'express';
import { chatbotService } from '../services/chatbotService';
import { ragService } from '../services/ragService';
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

  // Generate response using RAG
  const { response, sources } = await ragService.generateResponse(
    chatbotId,
    message,
    chatbot.instructions
  );

  // Generate conversation ID
  const conversationId = uuidv4();

  // Optionally store conversation for analytics (implement later)
  // await conversationService.storeConversation(chatbotId, message, response, sources);

  res.status(200).json({
    response,
    sources,
    conversationId,
  });
});
