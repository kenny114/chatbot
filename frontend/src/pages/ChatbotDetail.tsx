import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Plus,
  Trash2,
  Eye,
  RotateCw,
  Globe,
  FileText,
  Type,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageSquare,
  Settings,
  BarChart3,
  Palette,
  Lock,
  ArrowRight,
  Users,
  Calendar,
  Mail,
  Save,
} from 'lucide-react';
import { chatbotAPI } from '../services/api';
import { Chatbot, DataSource } from '../types';
import AddDataSourceModal from '../components/AddDataSourceModal';
import ChatWidget from '../components/ChatWidget';
import ChatbotCustomizationWrapper from '../components/ChatbotCustomizationWrapper';
import { NoDataSourcesEmptyState } from '../components/EmptyState';
import { ChatbotDetailLoadingSkeleton } from '../components/LoadingState';
import { usePlan } from '../contexts/PlanContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';

interface LeadCaptureConfig {
  lead_capture_enabled: boolean;
  booking_enabled: boolean;
  booking_link: string | null;
  notification_email: string | null;
}
const ChatbotDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isFreePlan } = usePlan();
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [viewingSourceId, setViewingSourceId] = useState<string | null>(null);
  const [sourceChunks, setSourceChunks] = useState<any[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [leadConfig, setLeadConfig] = useState<LeadCaptureConfig>({
    lead_capture_enabled: false,
    booking_enabled: false,
    booking_link: null,
    notification_email: null,
  });
  const [isSavingLeadConfig, setIsSavingLeadConfig] = useState(false);

  const fetchData = async () => {
    if (!id) return;

    try {
      const [chatbotResponse, sourcesResponse] = await Promise.all([
        chatbotAPI.getChatbot(id),
        chatbotAPI.getDataSources(id),
      ]);
      setChatbot(chatbotResponse.chatbot);
      setDataSources(sourcesResponse.dataSources);
    } catch (error) {
      console.error('Failed to fetch chatbot data:', error);
      alert('Failed to load chatbot');
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // Auto-refresh when there are processing data sources
  useEffect(() => {
    const hasProcessing = dataSources.some((ds) => ds.status === 'processing');

    if (hasProcessing) {
      const interval = setInterval(() => {
        fetchData();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [dataSources, id]);

  // Fetch lead capture config
  useEffect(() => {
    const fetchLeadConfig = async () => {
      if (!id) return;
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '/api';
        const response = await fetch(`${apiUrl}/chatbots/${id}/lead-config`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (response.ok) {
          const config = await response.json();
          setLeadConfig({
            lead_capture_enabled: config.lead_capture_enabled || false,
            booking_enabled: config.booking_enabled || false,
            booking_link: config.booking_link || '',
            notification_email: config.notification_email || '',
          });
        }
      } catch (error) {
        console.error('Failed to fetch lead config:', error);
      }
    };
    fetchLeadConfig();
  }, [id]);

  const handleSaveLeadConfig = async () => {
    if (!id) return;
    setIsSavingLeadConfig(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiUrl}/chatbots/${id}/lead-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(leadConfig),
      });
      if (!response.ok) throw new Error('Failed to save');
      alert('Lead capture settings saved!');
    } catch (error) {
      console.error('Failed to save lead config:', error);
      alert('Failed to save lead capture settings');
    } finally {
      setIsSavingLeadConfig(false);
    }
  };

  const handleAddSourceSuccess = () => {
    setShowAddSourceModal(false);
    fetchData();
  };

  const handleDeleteSource = async () => {
    if (!deleteConfirm || !id) return;

    setIsDeleting(true);
    try {
      await chatbotAPI.deleteDataSource(id, deleteConfirm);
      setDataSources(dataSources.filter((source) => source.id !== deleteConfirm));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete data source:', error);
      alert('Failed to delete data source');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRetrySource = async (sourceId: string) => {
    try {
      const failedSource = dataSources.find((s) => s.id === sourceId);
      if (!failedSource || failedSource.type !== 'url') return;

      await chatbotAPI.deleteDataSource(id!, sourceId);
      await chatbotAPI.addUrlSource(id!, failedSource.source_url!);

      fetchData();
      alert('Retry started! The crawl will begin shortly.');
    } catch (error) {
      console.error('Failed to retry:', error);
      alert('Failed to retry data source');
    }
  };

  const handleViewContent = async (sourceId: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(
        `${apiUrl}/chatbots/${id}/sources/${sourceId}/chunks`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch content');

      const data = await response.json();
      setSourceChunks(data.chunks || []);
      setViewingSourceId(sourceId);
    } catch (error) {
      console.error('Failed to fetch content:', error);
      alert('Failed to load content');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const generateEmbedCode = () => {
    const frontendUrl = typeof window !== 'undefined' ? window.location.origin : 'https://chatbotfrontend-gamma.vercel.app';
    return `<script src="${frontendUrl}/widget.js" data-chatbot-id="${id}"></script>`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
      case 'completed':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {status === 'ready' ? 'Ready' : 'Completed'}
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Processing
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'url':
        return <Globe className="h-5 w-5 text-primary" />;
      case 'text':
        return <Type className="h-5 w-5 text-accent" />;
      case 'file':
        return <FileText className="h-5 w-5 text-info-500" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container-responsive py-8">
        <ChatbotDetailLoadingSkeleton />
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="container-responsive py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Chatbot not found</p>
            <Button onClick={() => navigate('/dashboard')} className="mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-responsive py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">{chatbot.name}</h1>
              {getStatusBadge(chatbot.status)}
            </div>
            {chatbot.description && (
              <p className="text-muted-foreground mt-1">{chatbot.description}</p>
            )}
          </div>
        </div>
        {chatbot.status === 'ready' && (
          <Button onClick={() => setShowChat(!showChat)} size="lg">
            <MessageSquare className="h-5 w-5 mr-2" />
            {showChat ? 'Hide' : 'Test'} Chat
          </Button>
        )}
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="sources" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Data Sources
            <Badge variant="secondary" className="ml-1">
              {dataSources.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="customize" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Customize
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Data Sources</CardDescription>
                <CardTitle className="text-3xl">{dataSources.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Ready Sources</CardDescription>
                <CardTitle className="text-3xl">
                  {dataSources.filter((s) => s.status === 'completed').length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Processing</CardDescription>
                <CardTitle className="text-3xl">
                  {dataSources.filter((s) => s.status === 'processing').length}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Webhook & Embed - Pro Only */}
          {isFreePlan ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <Lock className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Go Live with Pro</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                    Upgrade to Pro to get your Webhook URL and Embed Code to integrate your chatbot on your website.
                  </p>
                  <Link to="/pricing">
                    <Button>
                      Upgrade to Pro
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Webhook URL</CardTitle>
                  <CardDescription>Use this URL to integrate your chatbot</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
                      {chatbot.webhook_url}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(chatbot.webhook_url)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Embed Code</CardTitle>
                  <CardDescription>Add this script to your website</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
                      {generateEmbedCode()}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(generateEmbedCode())}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Chatbot Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {chatbot.instructions || 'No custom instructions provided'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Sources Tab */}
        <TabsContent value="sources" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Data Sources</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage the knowledge base for your chatbot
              </p>
            </div>
            <Button onClick={() => setShowAddSourceModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </div>

          {dataSources.length === 0 ? (
            <NoDataSourcesEmptyState onAddClick={() => setShowAddSourceModal(true)} />
          ) : (
            <div className="grid gap-4">
              {dataSources.map((source) => (
                <Card key={source.id} className="card-hover">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {getSourceIcon(source.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-foreground">
                              {source.type.toUpperCase()}
                            </h3>
                            {getStatusBadge(source.status)}
                          </div>
                          {source.type === 'url' && (
                            <p className="text-sm text-muted-foreground truncate">
                              {source.source_url}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Added {new Date(source.created_at).toLocaleDateString()}
                          </p>
                          {source.error_message && (
                            <div className="flex items-start gap-2 p-2 mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded">
                              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>{source.error_message}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {source.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewContent(source.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        )}
                        {source.status === 'failed' && source.type === 'url' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetrySource(source.id)}
                          >
                            <RotateCw className="h-4 w-4 mr-1" />
                            Retry
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteConfirm(source.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Customize Tab */}
        <TabsContent value="customize" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Customize Chatbot</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Personalize your chatbot's appearance and behavior
            </p>
          </div>
          <ChatbotCustomizationWrapper chatbotId={id!} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Settings</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Advanced settings and danger zone
            </p>
          </div>

          {/* Lead Capture Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Lead Capture
              </CardTitle>
              <CardDescription>
                Capture leads and book calls from your chatbot conversations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable Lead Capture */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="lead-capture-enabled" className="text-base font-medium">
                    Enable Lead Capture
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Ask visitors for their email when they show interest
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${leadConfig.lead_capture_enabled ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {leadConfig.lead_capture_enabled ? 'ON' : 'OFF'}
                  </span>
                  <Switch
                    id="lead-capture-enabled"
                    checked={leadConfig.lead_capture_enabled}
                    onCheckedChange={(checked) =>
                      setLeadConfig({ ...leadConfig, lead_capture_enabled: checked })
                    }
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>
              </div>

              {/* Notification Email */}
              <div className="space-y-2">
                <Label htmlFor="notification-email" className="flex items-center gap-2 text-base font-medium">
                  <Mail className="h-4 w-4" />
                  Notification Email
                </Label>
                <Input
                  id="notification-email"
                  type="email"
                  placeholder="you@example.com"
                  value={leadConfig.notification_email || ''}
                  onChange={(e) =>
                    setLeadConfig({ ...leadConfig, notification_email: e.target.value })
                  }
                  className="max-w-md"
                />
                <p className="text-sm text-muted-foreground">
                  Get notified when new leads are captured
                </p>
              </div>

              {/* Enable Booking */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="booking-enabled" className="text-base font-medium">
                    Enable Call Booking
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Show a Calendly booking button after capturing lead
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${leadConfig.booking_enabled ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {leadConfig.booking_enabled ? 'ON' : 'OFF'}
                  </span>
                  <Switch
                    id="booking-enabled"
                    checked={leadConfig.booking_enabled}
                    onCheckedChange={(checked) =>
                      setLeadConfig({ ...leadConfig, booking_enabled: checked })
                    }
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>
              </div>

              {/* Calendly Link - Always visible */}
              <div className="space-y-2">
                <Label htmlFor="booking-link" className="flex items-center gap-2 text-base font-medium">
                  <Calendar className="h-4 w-4" />
                  Calendly Link
                </Label>
                <Input
                  id="booking-link"
                  type="url"
                  placeholder="https://calendly.com/your-name"
                  value={leadConfig.booking_link || ''}
                  onChange={(e) =>
                    setLeadConfig({ ...leadConfig, booking_link: e.target.value })
                  }
                  className="max-w-md"
                  disabled={!leadConfig.booking_enabled}
                />
                <p className="text-sm text-muted-foreground">
                  {leadConfig.booking_enabled
                    ? 'Your Calendly scheduling link for booking calls'
                    : 'Enable Call Booking above to use this feature'}
                </p>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveLeadConfig}
                disabled={isSavingLeadConfig}
                className="w-full sm:w-auto"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSavingLeadConfig ? 'Saving...' : 'Save Lead Capture Settings'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-error-200 dark:border-error-800">
            <CardHeader>
              <CardTitle className="text-error-600 dark:text-error-400">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions for this chatbot</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => alert('Delete functionality coming soon')}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Chatbot
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddDataSourceModal
        open={showAddSourceModal}
        chatbotId={id!}
        onClose={() => setShowAddSourceModal(false)}
        onSuccess={handleAddSourceSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Data Source</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this data source? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSource} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content Viewer Dialog */}
      <Dialog open={!!viewingSourceId} onOpenChange={() => setViewingSourceId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Crawled Content</DialogTitle>
            <DialogDescription>
              {sourceChunks.length} content chunks found
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {sourceChunks.length === 0 ? (
              <p className="text-muted-foreground">No content available</p>
            ) : (
              sourceChunks.map((chunk, idx) => (
                <Card key={chunk.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-sm">Chunk {idx + 1}</CardTitle>
                      {chunk.metadata?.source_url && (
                        <a
                          href={chunk.metadata.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Source URL ↗
                        </a>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {chunk.content.substring(0, 500)}
                      {chunk.content.length > 500 && '...'}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Chat Widget */}
      {showChat && <ChatWidget chatbotId={id!} chatbotName={chatbot.name} />}
    </div>
  );
};

export default ChatbotDetail;
