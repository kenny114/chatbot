import React from 'react';
import ReactDOM from 'react-dom/client';
import EmbeddableWidget from './EmbeddableWidget';

interface ChatbotWidgetConfig {
  chatbotId: string;
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
}

class ChatbotWidget {
  private config: ChatbotWidgetConfig;
  private container: HTMLDivElement | null = null;
  private root: ReactDOM.Root | null = null;

  constructor(config: ChatbotWidgetConfig) {
    this.config = {
      position: 'bottom-right',
      primaryColor: '#3b82f6',
      ...config
    };
  }

  init() {
    if (this.container) {
      console.warn('Chatbot widget already initialized');
      return;
    }

    this.container = document.createElement('div');
    this.container.id = 'chatbot-widget-root';
    document.body.appendChild(this.container);

    this.root = ReactDOM.createRoot(this.container);
    this.root.render(
      <React.StrictMode>
        <EmbeddableWidget
          chatbotId={this.config.chatbotId}
          position={this.config.position}
          primaryColor={this.config.primaryColor}
        />
      </React.StrictMode>
    );
  }

  destroy() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    if (this.container) {
      document.body.removeChild(this.container);
      this.container = null;
    }
  }
}

declare global {
  interface Window {
    ChatbotWidget: typeof ChatbotWidget;
  }
}

window.ChatbotWidget = ChatbotWidget;

// Auto-initialize from script tag data attributes
(function autoInit() {
  const currentScript = document.currentScript as HTMLScriptElement;
  if (currentScript) {
    const chatbotId = currentScript.getAttribute('data-chatbot-id');
    const position = currentScript.getAttribute('data-position') as 'bottom-right' | 'bottom-left' | null;
    const primaryColor = currentScript.getAttribute('data-primary-color');

    if (chatbotId) {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          const widget = new ChatbotWidget({
            chatbotId,
            position: position || 'bottom-right',
            primaryColor: primaryColor || '#3b82f6'
          });
          widget.init();
        });
      } else {
        const widget = new ChatbotWidget({
          chatbotId,
          position: position || 'bottom-right',
          primaryColor: primaryColor || '#3b82f6'
        });
        widget.init();
      }
    }
  }
})();

export default ChatbotWidget;
