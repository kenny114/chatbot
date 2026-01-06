import React, { useState, useRef, useEffect } from 'react';
import { webhookAPI } from '../services/api';
import { ChatMessage } from '../types';

interface ChatWidgetProps {
  chatbotId: string;
  chatbotName: string;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ chatbotId, chatbotName }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello! I'm ${chatbotName}. How can I help you today?`,
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await webhookAPI.sendMessage(chatbotId, inputMessage);
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
        sources: response.sources,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: error.response?.data?.error || 'Sorry, I encountered an error. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-widget">
      <div className="chat-widget-header">
        <h3>{chatbotName}</h3>
      </div>

      <div className="chat-widget-messages">
        {messages.map((message, index) => (
          <div key={index} className={`chat-message ${message.role}`}>
            <div className="chat-message-content">
              {message.content}
              {message.sources && message.sources.length > 0 && (
                <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.8 }}>
                  <strong>Sources:</strong>
                  <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                    {message.sources.map((source, i) => (
                      <li key={i}>
                        <a
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'inherit', textDecoration: 'underline' }}
                        >
                          {source}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="chat-message assistant">
            <div className="chat-message-content">Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-widget-input" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !inputMessage.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatWidget;
