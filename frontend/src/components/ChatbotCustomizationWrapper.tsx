import React, { useState, useEffect } from 'react';
import ChatbotCustomizationPanel, { ChatbotCustomization } from './ChatbotCustomizationPanel';
import LoadingState from './LoadingState';

interface ChatbotCustomizationWrapperProps {
  chatbotId: string;
}

const defaultCustomization: ChatbotCustomization = {
  widget: {
    primaryColor: '#6366f1',
    accentColor: '#10b981',
    position: 'bottom-right',
    welcomeMessage: 'Hello! How can I help you today?',
  },
  behavior: {
    tone: 'professional',
    language: 'en',
    responseLength: 'concise',
    showSources: true,
  },
};

const ChatbotCustomizationWrapper: React.FC<ChatbotCustomizationWrapperProps> = ({ chatbotId }) => {
  const [customization, setCustomization] = useState<ChatbotCustomization>(defaultCustomization);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // TODO: Load customization from API
    // For now, just use default
    setIsLoading(false);
  }, [chatbotId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Save to API
      console.log('Saving customization:', customization);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      alert('Customization saved successfully!');
    } catch (error) {
      console.error('Error saving customization:', error);
      alert('Failed to save customization');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <ChatbotCustomizationPanel
      customization={customization}
      onChange={setCustomization}
      onSave={handleSave}
      isSaving={isSaving}
    />
  );
};

export default ChatbotCustomizationWrapper;
