import { Request, Response } from 'express';
import { customizationService } from '../services/customizationService';
import { chatbotService } from '../services/chatbotService';

export const customizationController = {
  /**
   * GET /api/chatbots/:id/customization
   * Get chatbot customization settings
   */
  async getCustomization(req: any, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify chatbot belongs to user
      const chatbot = await chatbotService.getChatbot(id);
      if (chatbot.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const customization = await customizationService.getCustomization(id);

      res.json({ customization });
    } catch (error) {
      console.error('Error fetching customization:', error);
      res.status(500).json({ error: 'Failed to fetch customization settings' });
    }
  },

  /**
   * PUT /api/chatbots/:id/customization
   * Update chatbot customization settings
   */
  async updateCustomization(req: any, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const settings = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify chatbot belongs to user
      const chatbot = await chatbotService.getChatbot(id);
      if (chatbot.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Validate settings
      if (settings.primaryColor && !/^#[0-9A-F]{6}$/i.test(settings.primaryColor)) {
        return res.status(400).json({ error: 'Invalid primary color format' });
      }

      if (settings.accentColor && !/^#[0-9A-F]{6}$/i.test(settings.accentColor)) {
        return res.status(400).json({ error: 'Invalid accent color format' });
      }

      if (settings.widgetPosition && !['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(settings.widgetPosition)) {
        return res.status(400).json({ error: 'Invalid widget position' });
      }

      const customization = await customizationService.updateCustomization(id, settings);

      res.json({ customization, message: 'Customization updated successfully' });
    } catch (error) {
      console.error('Error updating customization:', error);
      res.status(500).json({ error: 'Failed to update customization settings' });
    }
  },

  /**
   * DELETE /api/chatbots/:id/customization
   * Reset chatbot customization to defaults
   */
  async resetCustomization(req: any, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify chatbot belongs to user
      const chatbot = await chatbotService.getChatbot(id);
      if (chatbot.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await customizationService.deleteCustomization(id);
      await customizationService.createDefaultCustomization(id);

      const customization = await customizationService.getCustomization(id);

      res.json({ customization, message: 'Customization reset to defaults' });
    } catch (error) {
      console.error('Error resetting customization:', error);
      res.status(500).json({ error: 'Failed to reset customization settings' });
    }
  },
};
