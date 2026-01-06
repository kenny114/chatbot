import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { chatbotService } from '../services/chatbotService';
import { asyncHandler } from '../middleware/errorHandler';

export const createChatbot = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, description, instructions } = req.body;
  const userId = req.userId!;

  const chatbot = await chatbotService.createChatbot(userId, name, description, instructions);

  res.status(201).json({
    message: 'Chatbot created successfully',
    chatbot,
  });
});

export const getChatbots = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  const chatbots = await chatbotService.getChatbots(userId);

  res.status(200).json({
    chatbots,
  });
});

export const getChatbot = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.userId!;

  const chatbot = await chatbotService.getChatbot(id, userId);

  res.status(200).json({
    chatbot,
  });
});

export const deleteChatbot = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.userId!;

  await chatbotService.deleteChatbot(id, userId);

  res.status(200).json({
    message: 'Chatbot deleted successfully',
  });
});

export const addUrlSource = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { url } = req.body;
  const userId = req.userId!;

  // Verify ownership
  await chatbotService.getChatbot(id, userId);

  const dataSource = await chatbotService.addUrlSource(id, url);

  res.status(201).json({
    message: 'URL source added and processing started',
    dataSource,
  });
});

export const addTextSource = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.userId!;

  // Verify ownership
  await chatbotService.getChatbot(id, userId);

  const dataSource = await chatbotService.addTextSource(id, content);

  res.status(201).json({
    message: 'Text source added and processing started',
    dataSource,
  });
});

export const getDataSources = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.userId!;

  // Verify ownership
  await chatbotService.getChatbot(id, userId);

  const dataSources = await chatbotService.getDataSources(id);

  res.status(200).json({
    dataSources,
  });
});

export const getChatbotStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.userId!;

  const chatbot = await chatbotService.getChatbot(id, userId);
  const dataSources = await chatbotService.getDataSources(id);

  res.status(200).json({
    status: chatbot.status,
    dataSources: dataSources.map(ds => ({
      id: ds.id,
      type: ds.type,
      status: ds.status,
      error_message: ds.error_message,
    })),
  });
});

export const deleteDataSource = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id, sourceId } = req.params;
  const userId = req.userId!;

  // Verify ownership
  await chatbotService.getChatbot(id, userId);

  await chatbotService.deleteDataSource(sourceId);

  res.status(200).json({
    message: 'Data source deleted successfully',
  });
});

/**
 * Get chunks for a data source
 */
export const getDataSourceChunks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { chatbotId, sourceId } = req.params;
  const userId = req.userId!;

  // Verify ownership
  const chatbot = await chatbotService.getChatbot(chatbotId, userId);

  if (!chatbot) {
    res.status(404).json({ error: 'Chatbot not found' });
    return;
  }

  // Fetch chunks
  const chunks = await chatbotService.getDataSourceChunks(sourceId);

  res.status(200).json({ chunks });
});
