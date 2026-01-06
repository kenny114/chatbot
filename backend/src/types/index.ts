export interface User {
  id: string;
  email: string;
  password_hash: string;
  company_name: string;
  created_at: string;
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

export interface ContentChunk {
  id: string;
  chatbot_id: string;
  data_source_id: string;
  content: string;
  embedding: number[];
  metadata: {
    source_url?: string;
    chunk_index: number;
    total_chunks: number;
  };
  created_at: string;
}

export interface Conversation {
  id: string;
  chatbot_id: string;
  user_message: string;
  bot_response: string;
  sources_used: string[];
  created_at: string;
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
}

export interface ChatResponse {
  response: string;
  sources: string[];
  conversation_id: string;
}
