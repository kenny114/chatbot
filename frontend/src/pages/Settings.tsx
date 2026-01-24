import React, { useState, useEffect } from 'react';
import { User, CreditCard, Bell, Key, Shield, Save, Copy, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import SubscriptionBadge from '../components/SubscriptionBadge';
import { useAuth } from '../contexts/AuthContext';
import { usageAPI } from '../services/api';

const Settings: React.FC = () => {
  const { user, subscription } = useAuth();
  const [showApiKey, setShowApiKey] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [usage, setUsage] = useState({ chatbotsUsed: 0, messagesUsed: 0 });

  // Fetch usage data
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const data = await usageAPI.getUsage();
        setUsage({
          chatbotsUsed: data.usage?.chatbotsUsed || 0,
          messagesUsed: data.usage?.messagesUsed || 0
        });
      } catch (error) {
        console.error('Failed to fetch usage:', error);
      }
    };
    fetchUsage();
  }, []);

  // Mock data for now - will be replaced with real data from backend
  const apiKey = 'sk_test_4eC39HqLyjWDarjtT1zdp7dc';
  const currentPlan = subscription?.plan_name || 'Free';

  // Prepare subscription data for SubscriptionBadge component
  // Map plan names to expected values
  const planMapping: Record<string, 'free' | 'starter' | 'pro' | 'enterprise'> = {
    'free': 'free',
    'starter': 'starter',
    'pro': 'pro',
    'professional': 'pro',  // Map "Professional" to "pro"
    'business': 'pro',      // Map "Business" to "pro"
    'enterprise': 'enterprise',
  };

  const normalizedPlan = planMapping[currentPlan.toLowerCase()] || 'free';

  // Get actual plan limits based on the subscription plan
  const planLimits: Record<string, { messages: number; chatbots: number }> = {
    'free': { messages: 100, chatbots: 1 },
    'starter': { messages: 1000, chatbots: 1 },
    'pro': { messages: 10000, chatbots: 5 },
    'enterprise': { messages: -1, chatbots: -1 }, // Unlimited
  };

  const limits = planLimits[normalizedPlan] || planLimits.free;

  const subscriptionData = {
    plan: normalizedPlan,
    status: (subscription?.status === 'active' ? 'active' : 'active') as 'active' | 'trialing' | 'past_due' | 'canceled',
    usage: {
      messages: {
        used: usage.messagesUsed,
        limit: limits.messages,
      },
      chatbots: {
        used: usage.chatbotsUsed,
        limit: limits.chatbots,
      },
    },
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    alert('API key copied to clipboard!');
  };

  return (
    <div className="container-responsive py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your account profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Doe" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@example.com" defaultValue={user?.email} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input id="company" placeholder="Acme Inc." defaultValue={user?.company_name} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Input id="bio" placeholder="Tell us about yourself" />
              </div>

              <Separator />

              <div className="flex justify-end gap-3">
                <Button variant="outline">Cancel</Button>
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Manage your subscription and billing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{currentPlan} Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    {normalizedPlan === 'starter' && '$19/month'}
                    {normalizedPlan === 'pro' && '$45/month'}
                    {normalizedPlan === 'enterprise' && 'Custom pricing'}
                    {normalizedPlan === 'free' && 'Free'}
                  </p>
                </div>
                <Badge className="bg-primary">Active</Badge>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-4">Usage This Month</h4>
                <SubscriptionBadge
                  subscription={subscriptionData}
                  variant="expanded"
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Plan Management</h4>
                <div className="flex gap-3">
                  <Button variant="outline">Upgrade Plan</Button>
                  <Button variant="outline">View Billing History</Button>
                </div>
              </div>

              <Separator />

              <div className="p-4 bg-error-50 dark:bg-error-950/30 border border-error-200 dark:border-error-800 rounded-lg">
                <h4 className="text-sm font-semibold text-error-600 dark:text-error-400 mb-2">
                  Cancel Subscription
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Your subscription will remain active until the end of the current billing period.
                </p>
                <Button variant="destructive" size="sm">
                  Cancel Subscription
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates about your chatbots
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weekly-reports">Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Get weekly analytics reports via email
                  </p>
                </div>
                <Switch
                  id="weekly-reports"
                  checked={weeklyReports}
                  onCheckedChange={setWeeklyReports}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="security-alerts">Security Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts about security events
                  </p>
                </div>
                <Switch
                  id="security-alerts"
                  checked={securityAlerts}
                  onCheckedChange={setSecurityAlerts}
                />
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage your API keys for integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Key className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Production API Key</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Use this key for production integrations
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono">
                        {showApiKey ? apiKey : '••••••••••••••••••••••••••••••••'}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCopyApiKey}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Generate New Key</h4>
                <Button variant="outline">
                  <Key className="h-4 w-4 mr-2" />
                  Generate New API Key
                </Button>
              </div>

              <Separator />

              <div className="p-4 bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800 rounded-lg">
                <p className="text-sm text-warning-700 dark:text-warning-300">
                  <strong>Warning:</strong> Keep your API keys secure. Never share them or commit them to version control.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" />
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button>
                  <Shield className="h-4 w-4 mr-2" />
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">2FA Status</p>
                  <p className="text-sm text-muted-foreground">Not enabled</p>
                </div>
                <Button variant="outline">Enable 2FA</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
