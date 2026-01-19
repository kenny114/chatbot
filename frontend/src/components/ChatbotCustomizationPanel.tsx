import React, { useState } from 'react';
import { Palette, Settings, MessageCircle, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from '@/lib/utils';

export interface ChatbotCustomization {
  widget: {
    primaryColor: string;
    accentColor: string;
    position: 'bottom-right' | 'bottom-left';
    avatar?: string;
    welcomeMessage: string;
  };
  behavior: {
    tone: 'professional' | 'friendly' | 'casual';
    language: string;
    responseLength: 'concise' | 'detailed';
    showSources: boolean;
  };
}

interface ChatbotCustomizationPanelProps {
  customization: ChatbotCustomization;
  onChange: (customization: ChatbotCustomization) => void;
  onSave: () => void;
  isSaving?: boolean;
}

const COLOR_PRESETS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Green', value: '#10b981' },
  { name: 'Orange', value: '#f59e0b' },
];

const ChatbotCustomizationPanel: React.FC<ChatbotCustomizationPanelProps> = ({
  customization,
  onChange,
  onSave,
  isSaving = false,
}) => {
  const [localCustomization, setLocalCustomization] = useState(customization);

  const handleWidgetChange = (field: keyof ChatbotCustomization['widget'], value: any) => {
    const updated = {
      ...localCustomization,
      widget: {
        ...localCustomization.widget,
        [field]: value,
      },
    };
    setLocalCustomization(updated);
    onChange(updated);
  };

  const handleBehaviorChange = (field: keyof ChatbotCustomization['behavior'], value: any) => {
    const updated = {
      ...localCustomization,
      behavior: {
        ...localCustomization.behavior,
        [field]: value,
      },
    };
    setLocalCustomization(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="behavior">
            <Settings className="h-4 w-4 mr-2" />
            Behavior
          </TabsTrigger>
        </TabsList>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6 mt-6">
          {/* Primary Color */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Primary Color</CardTitle>
              <CardDescription>
                Choose the main color for your chatbot widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={localCustomization.widget.primaryColor}
                  onChange={(e) => handleWidgetChange('primaryColor', e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={localCustomization.widget.primaryColor}
                  onChange={(e) => handleWidgetChange('primaryColor', e.target.value)}
                  className="flex-1 font-mono"
                  placeholder="#6366f1"
                />
              </div>

              {/* Color Presets */}
              <div className="grid grid-cols-6 gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleWidgetChange('primaryColor', preset.value)}
                    className={cn(
                      'w-full aspect-square rounded-md border-2 transition-all hover:scale-110',
                      localCustomization.widget.primaryColor === preset.value
                        ? 'border-foreground ring-2 ring-offset-2 ring-foreground'
                        : 'border-transparent'
                    )}
                    style={{ backgroundColor: preset.value }}
                    title={preset.name}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Widget Position */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Widget Position</CardTitle>
              <CardDescription>
                Choose where the chat widget appears on your website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={localCustomization.widget.position}
                onValueChange={(value: any) => handleWidgetChange('position', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Welcome Message */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Welcome Message</CardTitle>
              <CardDescription>
                The first message visitors see when they open the chat
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={localCustomization.widget.welcomeMessage}
                onChange={(e) => handleWidgetChange('welcomeMessage', e.target.value)}
                placeholder="Hi! How can I help you today?"
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Avatar Upload (placeholder for future) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Avatar</CardTitle>
              <CardDescription>
                Upload a custom avatar for your chatbot (optional)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>
                <Upload className="h-4 w-4 mr-2" />
                Upload Avatar (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Behavior Tab */}
        <TabsContent value="behavior" className="space-y-6 mt-6">
          {/* Tone */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Response Tone</CardTitle>
              <CardDescription>
                How your chatbot should communicate with users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={localCustomization.behavior.tone}
                onValueChange={(value: any) => handleBehaviorChange('tone', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Professional</span>
                      <span className="text-xs text-muted-foreground">
                        Formal and business-like
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="friendly">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Friendly</span>
                      <span className="text-xs text-muted-foreground">
                        Warm and approachable
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="casual">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Casual</span>
                      <span className="text-xs text-muted-foreground">
                        Relaxed and conversational
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Response Length */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Response Length</CardTitle>
              <CardDescription>
                Preferred length of chatbot responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={localCustomization.behavior.responseLength}
                onValueChange={(value: any) => handleBehaviorChange('responseLength', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concise">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Concise</span>
                      <span className="text-xs text-muted-foreground">
                        Short and to the point
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="detailed">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Detailed</span>
                      <span className="text-xs text-muted-foreground">
                        Comprehensive explanations
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Language */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Language</CardTitle>
              <CardDescription>
                The language your chatbot will use
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={localCustomization.behavior.language}
                onValueChange={(value) => handleBehaviorChange('language', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onSave} disabled={isSaving} size="lg">
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Preview Card */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Preview
          </CardTitle>
          <CardDescription>
            See how your chatbot will look with these settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center min-h-[200px]">
            <div className="text-center space-y-2">
              <div
                className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                style={{ backgroundColor: localCustomization.widget.primaryColor + '20' }}
              >
                <MessageCircle
                  className="h-8 w-8"
                  style={{ color: localCustomization.widget.primaryColor }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Interactive preview coming soon
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatbotCustomizationPanel;
