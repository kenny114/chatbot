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

export default api;
