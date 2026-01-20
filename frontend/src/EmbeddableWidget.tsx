import React, { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface EmbeddableWidgetProps {
  chatbotId: string;
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
}

const EmbeddableWidget: React.FC<EmbeddableWidgetProps> = ({
  chatbotId,
  position = 'bottom-right',
  primaryColor = '#3b82f6'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const apiUrl = 'https://eloquent-mercy-production.up.railway.app';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        content: 'Hello! How can I help you today?',
        role: 'assistant',
        timestamp: new Date()
      }]);
    }
  }, [isOpen, messages.length]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: inputValue,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/webhooks/${chatbotId}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const botMessage: Message = {
        id: `bot_${Date.now()}`,
        content: data.response || 'Sorry, I could not process your request.',
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const styles = {
    container: {
      position: 'fixed' as const,
      [position === 'bottom-left' ? 'left' : 'right']: '20px',
      bottom: '20px',
      zIndex: 9999,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    chatWindow: {
      position: 'absolute' as const,
      [position === 'bottom-left' ? 'left' : 'right']: '0',
      bottom: '80px',
      width: '380px',
      height: '600px',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden'
    },
    header: {
      backgroundColor: primaryColor,
      color: '#ffffff',
      padding: '16px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopLeftRadius: '12px',
      borderTopRightRadius: '12px'
    },
    headerTitle: {
      margin: 0,
      fontSize: '16px',
      fontWeight: 600
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: '#ffffff',
      fontSize: '24px',
      cursor: 'pointer',
      padding: '0',
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '4px',
      transition: 'background-color 0.2s'
    },
    messagesContainer: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '16px',
      backgroundColor: '#f9fafb'
    },
    message: {
      marginBottom: '12px',
      display: 'flex',
      flexDirection: 'column' as const
    },
    userMessage: {
      alignItems: 'flex-end'
    },
    botMessage: {
      alignItems: 'flex-start'
    },
    messageBubble: {
      maxWidth: '80%',
      padding: '10px 14px',
      borderRadius: '12px',
      fontSize: '14px',
      lineHeight: '1.5',
      wordWrap: 'break-word' as const
    },
    userBubble: {
      backgroundColor: primaryColor,
      color: '#ffffff',
      borderBottomRightRadius: '4px'
    },
    botBubble: {
      backgroundColor: '#ffffff',
      color: '#1f2937',
      border: '1px solid #e5e7eb',
      borderBottomLeftRadius: '4px'
    },
    inputContainer: {
      display: 'flex',
      gap: '8px',
      padding: '16px',
      backgroundColor: '#ffffff',
      borderTop: '1px solid #e5e7eb'
    },
    input: {
      flex: 1,
      padding: '10px 14px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.2s'
    },
    sendButton: {
      backgroundColor: primaryColor,
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'opacity 0.2s',
      opacity: (isLoading || !inputValue.trim()) ? 0.5 : 1
    },
    toggleButton: {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      backgroundColor: primaryColor,
      border: 'none',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      cursor: 'pointer',
      fontSize: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.2s, box-shadow 0.2s'
    },
    typingIndicator: {
      display: 'flex',
      gap: '4px',
      padding: '10px 14px'
    },
    typingDot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: '#9ca3af',
      animation: 'typing 1.4s infinite'
    }
  };

  return (
    <div style={styles.container}>
      {isOpen && (
        <div style={styles.chatWindow}>
          <div style={styles.header}>
            <h3 style={styles.headerTitle}>Chat Support</h3>
            <button
              style={styles.closeButton}
              onClick={() => setIsOpen(false)}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              ×
            </button>
          </div>
          <div style={styles.messagesContainer}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  ...styles.message,
                  ...(message.role === 'user' ? styles.userMessage : styles.botMessage)
                }}
              >
                <div
                  style={{
                    ...styles.messageBubble,
                    ...(message.role === 'user' ? styles.userBubble : styles.botBubble)
                  }}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ ...styles.message, ...styles.botMessage }}>
                <div style={{ ...styles.messageBubble, ...styles.botBubble }}>
                  <div style={styles.typingIndicator}>
                    <span style={styles.typingDot}></span>
                    <span style={{ ...styles.typingDot, animationDelay: '0.2s' }}></span>
                    <span style={{ ...styles.typingDot, animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div style={styles.inputContainer}>
            <input
              type="text"
              style={styles.input}
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              onFocus={(e) => e.currentTarget.style.borderColor = primaryColor}
              onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
            />
            <button
              style={styles.sendButton}
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              onMouseOver={(e) => !isLoading && inputValue.trim() && (e.currentTarget.style.opacity = '0.9')}
              onMouseOut={(e) => e.currentTarget.style.opacity = (isLoading || !inputValue.trim()) ? '0.5' : '1'}
            >
              Send
            </button>
          </div>
        </div>
      )}
      <button
        style={{
          ...styles.toggleButton,
          display: isOpen ? 'none' : 'flex'
        }}
        onClick={() => setIsOpen(true)}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        }}
      >
        💬
      </button>
      <style>{`
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
};

export default EmbeddableWidget;
