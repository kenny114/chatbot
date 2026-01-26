import React, { useState, useEffect, useRef, useCallback } from 'react';

// Types matching backend
type ConversationMode = 'INFO_MODE' | 'INTENT_CHECK_MODE' | 'LEAD_CAPTURE_MODE' | 'BOOKING_MODE' | 'CLOSURE_MODE';
type IntentLevel = 'LOW_INTENT' | 'MEDIUM_INTENT' | 'HIGH_INTENT';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  action?: ClientAction;
}

interface ClientAction {
  type: 'SHOW_EMAIL_INPUT' | 'SHOW_NAME_INPUT' | 'SHOW_REASON_INPUT' | 'SHOW_BOOKING_LINK' | 'CONVERSATION_CLOSED' | 'NONE';
  prompt?: string;
  url?: string;
  cta_text?: string;
  message?: string;
}

interface EnhancedChatResponse {
  response: string;
  sources: string[];
  session_id: string;
  conversation_id: string;
  conversation_mode: ConversationMode;
  intent_level: IntentLevel;
  actions: ClientAction[];
}

interface EmbeddableWidgetProps {
  chatbotId: string;
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
}

// Session storage key prefix
const SESSION_STORAGE_KEY = 'chatbot_session_';
const SESSION_EXPIRY_HOURS = 24;

interface StoredSession {
  sessionId: string;
  messages: Message[];
  conversationMode: ConversationMode;
  intentLevel: IntentLevel;
  createdAt: number;
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
  const [sessionId, setSessionId] = useState<string>('');
  const [conversationMode, setConversationMode] = useState<ConversationMode>('INFO_MODE');
  const [intentLevel, setIntentLevel] = useState<IntentLevel>('LOW_INTENT');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [showBookingButton, setShowBookingButton] = useState(false);
  const [bookingUrl, setBookingUrl] = useState('');
  const [bookingCtaText, setBookingCtaText] = useState('Book a Call');
  const [emailValue, setEmailValue] = useState('');
  const [isConversationClosed, setIsConversationClosed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const apiUrl = 'https://eloquent-mercy-production.up.railway.app';

  // Load session from storage on mount
  useEffect(() => {
    const storageKey = `${SESSION_STORAGE_KEY}${chatbotId}`;
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        const session: StoredSession = JSON.parse(stored);
        const now = Date.now();
        const hoursOld = (now - session.createdAt) / (1000 * 60 * 60);

        if (hoursOld < SESSION_EXPIRY_HOURS) {
          // Restore session
          setSessionId(session.sessionId);
          setMessages(session.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
          setConversationMode(session.conversationMode);
          setIntentLevel(session.intentLevel);
          return;
        }
      } catch (e) {
        console.error('Error restoring session:', e);
      }
    }

    // Create new session
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
  }, [chatbotId]);

  // Save session to storage on changes
  useEffect(() => {
    if (!sessionId) return;

    const storageKey = `${SESSION_STORAGE_KEY}${chatbotId}`;
    const session: StoredSession = {
      sessionId,
      messages,
      conversationMode,
      intentLevel,
      createdAt: Date.now(),
    };

    localStorage.setItem(storageKey, JSON.stringify(session));
  }, [chatbotId, sessionId, messages, conversationMode, intentLevel]);

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

  const handleServerAction = useCallback((action: ClientAction) => {
    switch (action.type) {
      case 'SHOW_EMAIL_INPUT':
        setShowEmailInput(true);
        setShowBookingButton(false);
        break;
      case 'SHOW_BOOKING_LINK':
        setShowBookingButton(true);
        setShowEmailInput(false);
        if (action.url) setBookingUrl(action.url);
        if (action.cta_text) setBookingCtaText(action.cta_text);
        break;
      case 'CONVERSATION_CLOSED':
        setIsConversationClosed(true);
        setShowEmailInput(false);
        setShowBookingButton(false);
        break;
      case 'NONE':
      default:
        // No special action
        break;
    }
  }, []);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: messageText,
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
          message: messageText,
          session_id: sessionId,
          page_url: window.location.href,
          referrer_url: document.referrer,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data: EnhancedChatResponse = await response.json();

      // Update state from response
      if (data.conversation_mode) setConversationMode(data.conversation_mode);
      if (data.intent_level) setIntentLevel(data.intent_level);
      if (data.session_id) setSessionId(data.session_id);

      // Handle actions
      const action = data.actions?.[0] || { type: 'NONE' };
      handleServerAction(action);

      const botMessage: Message = {
        id: `bot_${Date.now()}`,
        content: data.response || 'Sorry, I could not process your request.',
        role: 'assistant',
        timestamp: new Date(),
        action,
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

  const handleSendMessage = async () => {
    await sendMessage(inputValue);
  };

  const handleEmailSubmit = async () => {
    if (!emailValue.trim()) return;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        content: 'Please enter a valid email address.',
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    setShowEmailInput(false);
    await sendMessage(emailValue);
    setEmailValue('');
  };

  const handleBookingClick = async () => {
    // Track booking click
    try {
      await fetch(`${apiUrl}/api/webhooks/${chatbotId}/booking-click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });
    } catch (e) {
      console.error('Error tracking booking click:', e);
    }

    // Open Calendly in new tab
    window.open(bookingUrl, '_blank');

    // Add confirmation message
    const confirmMessage: Message = {
      id: `booking_${Date.now()}`,
      content: 'Great! A new tab has been opened for you to schedule your call. We look forward to speaking with you!',
      role: 'assistant',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, confirmMessage]);
    setShowBookingButton(false);
    setIsConversationClosed(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (showEmailInput) {
        handleEmailSubmit();
      } else {
        handleSendMessage();
      }
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
    },
    bookingButton: {
      backgroundColor: '#10b981',
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      padding: '12px 24px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      width: '100%',
      marginTop: '8px',
      transition: 'background-color 0.2s'
    },
    emailInputContainer: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
      padding: '16px',
      backgroundColor: '#f0f9ff',
      borderTop: '1px solid #e5e7eb'
    },
    emailLabel: {
      fontSize: '13px',
      color: '#6b7280',
      marginBottom: '4px'
    },
    closedMessage: {
      padding: '16px',
      backgroundColor: '#f0fdf4',
      borderTop: '1px solid #e5e7eb',
      textAlign: 'center' as const,
      color: '#166534',
      fontSize: '14px'
    }
  };

  const isInputDisabled = isLoading || isConversationClosed;

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
            {showBookingButton && (
              <div style={{ padding: '8px 0' }}>
                <button
                  style={styles.bookingButton}
                  onClick={handleBookingClick}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                >
                  {bookingCtaText}
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Email input section */}
          {showEmailInput && !isConversationClosed && (
            <div style={styles.emailInputContainer}>
              <span style={styles.emailLabel}>Enter your email to continue:</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  style={styles.input}
                  placeholder="your@email.com"
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  autoFocus
                />
                <button
                  style={{
                    ...styles.sendButton,
                    opacity: !emailValue.trim() ? 0.5 : 1
                  }}
                  onClick={handleEmailSubmit}
                  disabled={!emailValue.trim()}
                >
                  Submit
                </button>
              </div>
            </div>
          )}

          {/* Closed conversation message */}
          {isConversationClosed && (
            <div style={styles.closedMessage}>
              Thanks for chatting! We'll be in touch soon.
            </div>
          )}

          {/* Regular input */}
          {!showEmailInput && !isConversationClosed && (
            <div style={styles.inputContainer}>
              <input
                type="text"
                style={styles.input}
                placeholder="Type your message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isInputDisabled}
                onFocus={(e) => e.currentTarget.style.borderColor = primaryColor}
                onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
              />
              <button
                style={{
                  ...styles.sendButton,
                  opacity: (isLoading || !inputValue.trim()) ? 0.5 : 1
                }}
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                onMouseOver={(e) => !isLoading && inputValue.trim() && (e.currentTarget.style.opacity = '0.9')}
                onMouseOut={(e) => e.currentTarget.style.opacity = (isLoading || !inputValue.trim()) ? '0.5' : '1'}
              >
                Send
              </button>
            </div>
          )}
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
