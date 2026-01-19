import axios from 'axios';
import { Chatbot, DataSource } from '../types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: async (email: string, password: string, companyName: string) => {
    const response = await api.post('/auth/register', { email, password, companyName });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
};

// User API
export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/user/profile');
    return response.data;
  },
};

// Chatbot API
export const chatbotAPI = {
  createChatbot: async (name: string, description: string, instructions: string): Promise<{ chatbot: Chatbot }> => {
    const response = await api.post('/chatbots', { name, description, instructions });
    return response.data;
  },

  getChatbots: async (): Promise<{ chatbots: Chatbot[] }> => {
    const response = await api.get('/chatbots');
    return response.data;
  },

  getChatbot: async (id: string): Promise<{ chatbot: Chatbot }> => {
    const response = await api.get(`/chatbots/${id}`);
    return response.data;
  },

  deleteChatbot: async (id: string) => {
    const response = await api.delete(`/chatbots/${id}`);
    return response.data;
  },

  addUrlSource: async (chatbotId: string, url: string): Promise<{ dataSource: DataSource }> => {
    const response = await api.post(`/chatbots/${chatbotId}/sources/url`, { url });
    return response.data;
  },

  addTextSource: async (chatbotId: string, content: string): Promise<{ dataSource: DataSource }> => {
    const response = await api.post(`/chatbots/${chatbotId}/sources/text`, { content });
    return response.data;
  },

  getDataSources: async (chatbotId: string): Promise<{ dataSources: DataSource[] }> => {
    const response = await api.get(`/chatbots/${chatbotId}/sources`);
    return response.data;
  },

  getChatbotStatus: async (chatbotId: string) => {
    const response = await api.get(`/chatbots/${chatbotId}/status`);
    return response.data;
  },

  deleteDataSource: async (chatbotId: string, sourceId: string) => {
    const response = await api.delete(`/chatbots/${chatbotId}/sources/${sourceId}`);
    return response.data;
  },
};

// Webhook API (public, no auth)
export const webhookAPI = {
  sendMessage: async (chatbotId: string, message: string) => {
    const response = await axios.post(`${API_BASE_URL}/webhooks/${chatbotId}/query`, { message });
    return response.data;
  },
};

// Payment API
export const paymentAPI = {
  getPlans: async () => {
    const response = await api.get('/payments/plans');
    return response.data;
  },

  getPlan: async (planId: string) => {
    const response = await api.get(`/payments/plans/${planId}`);
    return response.data;
  },

  // One-time orders (for backwards compatibility)
  createOrder: async (planId: string) => {
    const response = await api.post('/payments/orders', { plan_id: planId });
    return response.data;
  },

  captureOrder: async (orderId: string) => {
    const response = await api.post(`/payments/orders/${orderId}/capture`, { order_id: orderId });
    return response.data;
  },

  getOrderDetails: async (orderId: string) => {
    const response = await api.get(`/payments/orders/${orderId}`);
    return response.data;
  },

  // Subscriptions
  createSubscription: async (planId: string) => {
    const response = await api.post('/payments/subscriptions', { plan_id: planId });
    return response.data;
  },

  activateSubscription: async (subscriptionId: string, planId: string) => {
    const response = await api.post('/payments/subscriptions/activate', {
      subscription_id: subscriptionId,
      plan_id: planId
    });
    return response.data;
  },

  getSubscriptionDetails: async (subscriptionId: string) => {
    const response = await api.get(`/payments/subscriptions/${subscriptionId}`);
    return response.data;
  },

  cancelSubscription: async (subscriptionId: string, reason?: string) => {
    const response = await api.post(`/payments/subscriptions/${subscriptionId}/cancel`, { reason });
    return response.data;
  },
};

// Analytics API
export const analyticsAPI = {
  getOverview: async (chatbotId?: string, timeRange: string = '7d') => {
    const params = new URLSearchParams();
    if (chatbotId) params.append('chatbotId', chatbotId);
    params.append('timeRange', timeRange);
    const response = await api.get(`/analytics/overview?${params.toString()}`);
    return response.data;
  },

  getMessagesOverTime: async (chatbotId?: string, timeRange: string = '7d') => {
    const params = new URLSearchParams();
    if (chatbotId) params.append('chatbotId', chatbotId);
    params.append('timeRange', timeRange);
    const response = await api.get(`/analytics/messages?${params.toString()}`);
    return response.data;
  },

  getPopularQuestions: async (chatbotId?: string, limit: number = 10) => {
    const params = new URLSearchParams();
    if (chatbotId) params.append('chatbotId', chatbotId);
    params.append('limit', limit.toString());
    const response = await api.get(`/analytics/popular-questions?${params.toString()}`);
    return response.data;
  },

  getResponseTimes: async (chatbotId?: string) => {
    const params = new URLSearchParams();
    if (chatbotId) params.append('chatbotId', chatbotId);
    const response = await api.get(`/analytics/response-times?${params.toString()}`);
    return response.data;
  },

  getConversations: async (chatbotId?: string, limit: number = 20) => {
    const params = new URLSearchParams();
    if (chatbotId) params.append('chatbotId', chatbotId);
    params.append('limit', limit.toString());
    const response = await api.get(`/analytics/conversations?${params.toString()}`);
    return response.data;
  },

  recordSatisfaction: async (conversationId: string, rating: number, feedback?: string) => {
    const response = await api.post('/analytics/satisfaction', { conversationId, rating, feedback });
    return response.data;
  },
};

// Usage API
export const usageAPI = {
  getUsage: async (): Promise<UsageResponse> => {
    const response = await api.get('/usage/me');
    return response.data;
  },

  getPlanFeatures: async (): Promise<PlanFeaturesResponse> => {
    const response = await api.get('/usage/features');
    return response.data;
  },
};

// Usage API response types
export interface UsageResponse {
  usage: {
    chatbotsUsed: number;
    messagesUsed: number;
    previewMessagesUsed: number;
  };
  limits: {
    chatbotLimit: number;
    messageLimit: number;
    previewMessageLimit: number;
  };
  plan: {
    id: string;
    name: string;
    status: string;
    currentPeriodEnd: string | null;
  };
  features: {
    liveEmbed: boolean;
    leadCapture: boolean;
    brandingRemoval: boolean;
    analyticsAccess: 'none' | 'preview' | 'full';
    businessHours: boolean;
  };
  isAtChatbotLimit: boolean;
  isAtPreviewLimit: boolean;
  canGoLive: boolean;
}

export interface PlanFeaturesResponse {
  plan: {
    id: string;
    name: string;
    status: string;
  };
  features: {
    chatbot_limit: number;
    message_limit: number;
    preview_messages: number;
    live_embed: boolean;
    lead_capture: boolean;
    branding_removal: boolean;
    analytics_access: 'none' | 'preview' | 'full';
    business_hours: boolean;
    website_scraping: boolean;
    document_upload: boolean;
    customization: boolean;
    industry_selection: boolean;
    tone_selection: boolean;
  };
}

export default api;
