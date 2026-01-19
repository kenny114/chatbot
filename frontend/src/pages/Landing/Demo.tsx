import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Bot, User } from 'lucide-react';

const Demo: React.FC = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    phone: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement demo request submission
    alert('Demo request submitted! We\'ll contact you soon.');
    setFormData({ companyName: '', email: '', phone: '' });
  };

  return (
    <section id="demo" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-muted/20 to-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            See It In Action
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Watch how our AI chatbot instantly answers customer questions with your company data
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Demo Chatbot Preview */}
          <div>
            <Card className="shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-primary to-primary text-primary-foreground">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center">
                      <Bot className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Demo Assistant</h3>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-accent rounded-full"></div>
                        <span className="text-sm text-primary-foreground/80">Online</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
                    Live Demo
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {/* Chat Messages */}
                <div className="h-96 overflow-y-auto p-6 space-y-4 bg-muted/30">
                  {/* Bot Message */}
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="bg-card rounded-lg p-3 shadow-sm max-w-xs border">
                      <p className="text-sm text-foreground">
                        Hi! I'm your AI assistant. I can answer questions about our products, pricing, and features. How can I help you today?
                      </p>
                    </div>
                  </div>

                  {/* User Message */}
                  <div className="flex items-start space-x-3 justify-end">
                    <div className="bg-primary text-primary-foreground rounded-lg p-3 shadow-sm max-w-xs">
                      <p className="text-sm">
                        What pricing plans do you offer?
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-accent" />
                    </div>
                  </div>

                  {/* Bot Response */}
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="bg-card rounded-lg p-3 shadow-sm max-w-xs border">
                      <p className="text-sm text-foreground">
                        We offer three pricing plans:
                        <br /><br />
                        <strong>Starter Plan:</strong> $19/month - Perfect for small businesses with 1 chatbot and 1,000 messages
                        <br /><br />
                        <strong>Professional Plan:</strong> $45/month - For growing businesses with 5 chatbots and 10,000 messages
                        <br /><br />
                        <strong>Custom:</strong> Custom pricing - Tailored to your specific needs with dedicated support
                      </p>
                    </div>
                  </div>

                  {/* Typing Indicator */}
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="bg-card rounded-lg p-3 shadow-sm border">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input Area */}
                <div className="p-4 border-t bg-background">
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Try asking about features..."
                      disabled
                      className="flex-1"
                    />
                    <Button size="icon" disabled className="bg-primary">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    This is a demo preview. Book a demo to try it live!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Book Demo Form */}
          <div>
            <Card className="shadow-lg">
              <CardHeader>
                <h3 className="text-2xl font-bold text-foreground">Book a Live Demo</h3>
                <p className="text-muted-foreground">
                  See how our AI chatbot can transform your customer support
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      placeholder="Acme Inc."
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Work Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-primary hover:opacity-90"
                    size="lg"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Schedule Demo
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Our team will contact you within 24 hours to schedule your personalized demo
                  </p>
                </form>
              </CardContent>
            </Card>

            {/* Benefits */}
            <div className="mt-8 space-y-4">
              <h4 className="font-semibold text-foreground">What you'll learn:</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start">
                  <MessageCircle className="w-5 h-5 text-primary mr-2 mt-0.5" />
                  <span>How to train your chatbot on your company data</span>
                </li>
                <li className="flex items-start">
                  <MessageCircle className="w-5 h-5 text-primary mr-2 mt-0.5" />
                  <span>Best practices for chatbot deployment</span>
                </li>
                <li className="flex items-start">
                  <MessageCircle className="w-5 h-5 text-primary mr-2 mt-0.5" />
                  <span>Integration options and customization</span>
                </li>
                <li className="flex items-start">
                  <MessageCircle className="w-5 h-5 text-primary mr-2 mt-0.5" />
                  <span>Analytics and performance metrics</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Demo;
