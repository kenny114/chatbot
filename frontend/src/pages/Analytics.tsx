import React, { useState, useEffect } from 'react';
import { Calendar, Download, TrendingUp, MessageSquare, Users, Clock, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import StatCard from '../components/StatCard';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import LoadingState from '../components/LoadingState';
import { analyticsAPI, chatbotAPI } from '../services/api';
import { Chatbot } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Analytics: React.FC = () => {
  const { subscription } = useAuth();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedChatbot, setSelectedChatbot] = useState<string>('all');
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has access to analytics (not on free plan)
  const hasAnalyticsAccess = subscription && subscription.plan_id !== 'free';

  // Analytics data state
  const [overview, setOverview] = useState<any>(null);
  const [messagesData, setMessagesData] = useState<any[]>([]);
  const [popularQuestions, setPopularQuestions] = useState<any[]>([]);
  const [responseTimes, setResponseTimes] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);

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

  // Fetch analytics data when filters change
  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const chatbotId = selectedChatbot === 'all' ? undefined : selectedChatbot;

        const [overviewData, messagesRes, questionsRes, responseTimesRes, conversationsRes] = await Promise.all([
          analyticsAPI.getOverview(chatbotId, timeRange),
          analyticsAPI.getMessagesOverTime(chatbotId, timeRange),
          analyticsAPI.getPopularQuestions(chatbotId, 5),
          analyticsAPI.getResponseTimes(chatbotId),
          analyticsAPI.getConversations(chatbotId, 10),
        ]);

        setOverview(overviewData);
        setMessagesData(messagesRes.messages || []);
        setPopularQuestions(questionsRes.questions || []);
        setResponseTimes(responseTimesRes.responseTimes || []);
        setConversations(conversationsRes.conversations || []);
      } catch (err: any) {
        console.error('Error fetching analytics:', err);
        setError(err.response?.data?.error || 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [selectedChatbot, timeRange]);

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds} sec ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''} ago`;
    return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''} ago`;
  };

  // Show premium lock if user doesn't have access
  if (!hasAnalyticsAccess) {
    return (
      <div className="container-responsive py-8">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-12 pb-12 text-center">
            <Lock className="h-16 w-16 mx-auto text-primary mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Premium Feature</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Full analytics is available on the Pro plan.
              Upgrade your account to unlock detailed insights and performance metrics.
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
    return <LoadingState message="Loading analytics..." />;
  }

  if (error) {
    return (
      <div className="container-responsive py-8">
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-responsive py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Track your chatbot performance and user engagement
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px] rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="rounded-full">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Chatbot Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-foreground">Filter by chatbot:</label>
            <Select value={selectedChatbot} onValueChange={setSelectedChatbot}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
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
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Messages"
          value={overview?.totalMessages?.toLocaleString() || '0'}
          icon={MessageSquare}
          trend={Math.round(overview?.trend?.messages || 0)}
          description={`${overview?.trend?.messages >= 0 ? '+' : ''}${Math.round(overview?.trend?.messages || 0)}% from last period`}
        />
        <StatCard
          label="Unique Users"
          value={overview?.uniqueUsers?.toLocaleString() || '0'}
          icon={Users}
          trend={Math.round(overview?.trend?.users || 0)}
          description={`${overview?.trend?.users >= 0 ? '+' : ''}${Math.round(overview?.trend?.users || 0)}% from last period`}
        />
        <StatCard
          label="Avg Response Time"
          value={`${(overview?.avgResponseTime / 1000 || 0).toFixed(1)}s`}
          icon={Clock}
          trend={Math.round(overview?.trend?.responseTime || 0)}
          description={`${overview?.trend?.responseTime >= 0 ? '+' : ''}${Math.round(overview?.trend?.responseTime || 0)}% from last period`}
          iconClassName="bg-info-100 dark:bg-info-900"
        />
        <StatCard
          label="Satisfaction Rate"
          value={`${Math.round(overview?.satisfactionRate || 0)}%`}
          icon={TrendingUp}
          trend={Math.round(overview?.trend?.satisfaction || 0)}
          description={`${overview?.trend?.satisfaction >= 0 ? '+' : ''}${Math.round(overview?.trend?.satisfaction || 0)}% from last period`}
          iconClassName="bg-success-100 dark:bg-success-900"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Messages Over Time</CardTitle>
            <CardDescription>Daily message volume for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {messagesData.length > 0 ? (
              <LineChart
                data={messagesData}
                xKey="date"
                yKey="messages"
                lineColor="#6366f1"
                height={250}
              />
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No message data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Response Times */}
        <Card>
          <CardHeader>
            <CardTitle>Response Times by Hour</CardTitle>
            <CardDescription>Average response time throughout the day</CardDescription>
          </CardHeader>
          <CardContent>
            {responseTimes.length > 0 ? (
              <LineChart
                data={responseTimes}
                xKey="hour"
                yKey="avgTime"
                lineColor="#10b981"
                height={250}
              />
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No response time data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Popular Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Most Popular Questions</CardTitle>
          <CardDescription>Top questions asked by users</CardDescription>
        </CardHeader>
        <CardContent>
          {popularQuestions.length > 0 ? (
            <BarChart
              data={popularQuestions}
              xKey="question"
              yKey="count"
              barColor="#10b981"
              height={300}
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No questions data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Conversations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
          <CardDescription>Latest interactions with your chatbots</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">User</th>
                    <th className="px-4 py-3 text-left font-medium">Question</th>
                    <th className="px-4 py-3 text-left font-medium">Chatbot</th>
                    <th className="px-4 py-3 text-left font-medium">Time</th>
                    <th className="px-4 py-3 text-left font-medium">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {conversations.length > 0 ? (
                    conversations.map((conv) => {
                      const chatbot = chatbots.find((c) => c.id === conv.chatbotId);
                      return (
                        <tr key={conv.id} className="border-b last:border-0">
                          <td className="px-4 py-3 text-muted-foreground">
                            {conv.userIdentifier || 'Anonymous'}
                          </td>
                          <td className="px-4 py-3 max-w-xs truncate" title={conv.userMessage}>
                            {conv.userMessage}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {chatbot?.name || 'Unknown'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatTimeAgo(conv.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            {conv.satisfactionRating ? (
                              <span className={conv.satisfactionRating >= 4 ? 'text-accent' : 'text-muted-foreground'}>
                                {conv.satisfactionRating >= 4 ? '👍 Positive' : '👎 Negative'}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">No rating</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No conversations yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
