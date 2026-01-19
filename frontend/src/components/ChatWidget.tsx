import React, { useState, useRef, useEffect } from 'react';
import { Send, Copy, Check, Bot, User, Loader2, ExternalLink } from 'lucide-react';
import { webhookAPI } from '../services/api';
import { ChatMessage } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';

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
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

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
    <Card className="fixed bottom-6 right-6 w-full max-w-md shadow-2xl z-50 border-2">
      <CardHeader className="border-b bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-lg">{chatbotName}</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Messages Area */}
        <ScrollArea className="h-[500px] p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                )}

                <div
                  className={cn(
                    'flex flex-col gap-2 max-w-[80%]',
                    message.role === 'user' && 'items-end'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-2.5 text-sm',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  </div>

                  {/* Assistant message actions */}
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 px-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => copyToClipboard(message.content, index)}
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1.5">
                      <p className="font-semibold text-muted-foreground">Sources:</p>
                      <div className="space-y-1">
                        {message.sources.map((source, i) => (
                          <a
                            key={i}
                            href={source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-primary hover:underline group"
                          >
                            <ExternalLink className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                            <span className="truncate">{source}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-5 w-5 text-accent" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4 bg-background">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              size="icon"
              className="flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatWidget;
