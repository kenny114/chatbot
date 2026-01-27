import React, { useState, useEffect } from 'react';
import { Download, Users, Calendar, TrendingUp, Mail, Phone, ExternalLink, Trash2, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import StatCard from '../components/StatCard';
import { PageLoadingState } from '../components/LoadingState';
import { chatbotAPI } from '../services/api';
import { Chatbot } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Lead {
  id: string;
  chatbot_id: string;
  email: string;
  name?: string;
  phone?: string;
  reason_for_interest?: string;
  page_url?: string;
  intent_level?: string;
  qualification_answers?: Record<string, string>;
  questions_asked?: string[];
  booking_status: string;
  owner_notified: boolean;
  created_at: string;
}

interface LeadAnalytics {
  total_leads: number;
  leads_today: number;
  leads_this_week: number;
  leads_this_month: number;
  conversion_rate: number;
  booking_rate: number;
  high_intent_percentage: number;
  average_messages_before_capture: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://eloquent-mercy-production.up.railway.app';

const Leads: React.FC = () => {
  const { subscription } = useAuth();
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const [selectedChatbot, setSelectedChatbot] = useState<string>('all');
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analytics, setAnalytics] = useState<LeadAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalLeads, setTotalLeads] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Check if user has access to leads (Pro plan)
  const hasLeadAccess = subscription && subscription.plan_id !== 'free';

  // Fetch chatbots on component mount
  useEffect(() => {
    const fetchChatbots = async () => {
      try {
        const { chatbots } = await chatbotAPI.getChatbots();
        setChatbots(chatbots);
      } catch (err) {
        console.error('Error fetching chatbots:', err);
      }
    };
    fetchChatbots();
  }, []);

  // Fetch leads when filters change
  useEffect(() => {
    const fetchLeads = async () => {
      if (!hasLeadAccess) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const chatbotId = selectedChatbot === 'all' ? undefined : selectedChatbot;

        // Fetch leads
        const leadsUrl = chatbotId
          ? `${API_URL}/api/chatbots/${chatbotId}/leads?limit=${pageSize}&offset=${page * pageSize}`
          : `${API_URL}/api/leads?limit=${pageSize}&offset=${page * pageSize}`;

        const leadsResponse = await fetch(leadsUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!leadsResponse.ok) {
          const errorData = await leadsResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch leads (${leadsResponse.status})`);
        }

        const leadsData = await leadsResponse.json();
        setLeads(leadsData.leads || []);
        setTotalLeads(leadsData.total || 0);

        // Fetch analytics if specific chatbot selected
        if (chatbotId) {
          const analyticsResponse = await fetch(`${API_URL}/api/chatbots/${chatbotId}/leads/analytics`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (analyticsResponse.ok) {
            const analyticsData = await analyticsResponse.json();
            setAnalytics(analyticsData);
          }
        } else {
          setAnalytics(null);
        }
      } catch (err: any) {
        console.error('Error fetching leads:', err);
        setError(err.message || 'Failed to load leads');
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [selectedChatbot, page, hasLeadAccess, token]);

  const handleExport = async () => {
    if (selectedChatbot === 'all') {
      alert('Please select a specific chatbot to export leads');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/chatbots/${selectedChatbot}/leads/export`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export leads');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${selectedChatbot}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting leads:', err);
      alert('Failed to export leads');
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/leads/${leadId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete lead');
      }

      setLeads(prev => prev.filter(l => l.id !== leadId));
      setTotalLeads(prev => prev - 1);
    } catch (err) {
      console.error('Error deleting lead:', err);
      alert('Failed to delete lead');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getIntentBadgeColor = (intent?: string) => {
    switch (intent) {
      case 'HIGH_INTENT':
        return 'bg-green-100 text-green-800';
      case 'MEDIUM_INTENT':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW_INTENT':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getBookingBadgeColor = (status: string) => {
    switch (status) {
      case 'BOOKED':
        return 'bg-green-100 text-green-800';
      case 'LINK_SHARED':
        return 'bg-blue-100 text-blue-800';
      case 'DECLINED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Show premium lock if user doesn't have access
  if (!hasLeadAccess) {
    return (
      <div className="container-responsive py-8">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-12 pb-12 text-center">
            <Lock className="h-16 w-16 mx-auto text-primary mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Premium Feature</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Lead capture and management is available on the Pro plan.
              Upgrade your account to start capturing leads from your chatbot conversations.
            </p>
            <Button onClick={() => navigate('/pricing')} className="rounded-full">
              Upgrade Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <PageLoadingState />;
  }

  return (
    <div className="container-responsive py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track leads captured by your chatbots
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedChatbot} onValueChange={setSelectedChatbot}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Chatbots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Chatbots</SelectItem>
              {chatbots.map((chatbot) => (
                <SelectItem key={chatbot.id} value={chatbot.id}>
                  {chatbot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExport} variant="outline" disabled={selectedChatbot === 'all'}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            label="Total Leads"
            value={analytics.total_leads.toString()}
            icon={Users}
            trend={analytics.leads_this_week > 0 ? { value: analytics.leads_this_week, label: "this week" } : undefined}
          />
          <StatCard
            label="This Week"
            value={analytics.leads_this_week.toString()}
            icon={TrendingUp}
          />
          <StatCard
            label="Conversion Rate"
            value={`${analytics.conversion_rate.toFixed(1)}%`}
            icon={TrendingUp}
            description="Conversations to leads"
          />
          <StatCard
            label="Booking Rate"
            value={`${analytics.booking_rate.toFixed(1)}%`}
            icon={Calendar}
            description="Leads that booked"
          />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10 mb-6">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Leads</CardTitle>
          <CardDescription>
            {totalLeads} total lead{totalLeads !== 1 ? 's' : ''} captured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No leads yet</h3>
              <p className="text-muted-foreground">
                Leads will appear here when visitors share their contact information through your chatbot.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Contact</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Intent</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Booking</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Page</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-foreground flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {lead.email}
                          </div>
                          {lead.name && (
                            <div className="text-sm text-muted-foreground">{lead.name}</div>
                          )}
                          {lead.phone && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getIntentBadgeColor(lead.intent_level)}`}>
                          {lead.intent_level?.replace('_', ' ') || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBookingBadgeColor(lead.booking_status)}`}>
                          {lead.booking_status?.replace('_', ' ') || 'Not Booked'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {lead.page_url ? (
                          <a
                            href={lead.page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1 max-w-[200px] truncate"
                          >
                            {new URL(lead.page_url).pathname || '/'}
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">{formatDate(lead.created_at)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLead(lead.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalLeads > pageSize && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalLeads)} of {totalLeads} leads
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * pageSize >= totalLeads}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Leads;
