export interface User {
  id: string;
  email: string;
  companyName: string;
}

export interface Chatbot {
  id: string;
  user_id: string;
  name: string;
  description: string;
  instructions: string;
  webhook_url: string;
  status: 'processing' | 'ready' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface DataSource {
  id: string;
  chatbot_id: string;
  type: 'url' | 'text';
  source_url?: string;
  content?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}
