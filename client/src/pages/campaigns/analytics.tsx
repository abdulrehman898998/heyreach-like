import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ArrowLeft, BarChart3, TrendingUp, Users, MessageSquare, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface CampaignAnalytics {
  id: number;
  name: string;
  status: string;
  totalLeads: number;
  messagesSent: number;
  messagesFailed: number;
  messagesPending: number;
  successRate: number;
  repliesReceived: number;
  positiveReplies: number;
  createdAt: string;
  lastActivity: string;
  dailyStats: {
    date: string;
    sent: number;
    failed: number;
    replies: number;
  }[];
}

const CampaignAnalytics: React.FC = () => {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);

  // Get campaign ID from URL
  const campaignId = window.location.pathname.split('/')[2];

  useEffect(() => {
    fetchAnalytics();
  }, [campaignId]);

  const fetchAnalytics = async () => {
    try {
      // Fetch campaign analytics
      const response = await fetch(`/api/campaigns/${campaignId}/stats`);
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.stats);
      } else {
        console.error('Failed to fetch analytics:', data.error);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'paused':
        return 'text-yellow-600 bg-yellow-100';
      case 'completed':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <TrendingUp className="w-4 h-4" />;
      case 'paused':
        return <Clock className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Analytics Not Found</h2>
          <p className="text-gray-600 mb-4">Unable to load campaign analytics.</p>
          <Button onClick={() => setLocation('/campaigns')}>
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => setLocation('/campaigns')}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{analytics.name} - Analytics</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(analytics.status)}`}>
                    {getStatusIcon(analytics.status)}
                    <span className="ml-1 capitalize">{analytics.status}</span>
                  </span>
                  <span className="text-sm text-gray-500">
                    Created: {new Date(analytics.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={() => window.print()}>
                Export Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="card-gradient hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Leads</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalLeads.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-gradient hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Messages Sent</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.messagesSent.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-gradient hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.successRate.toFixed(1)}%</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-gradient hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Replies Received</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.repliesReceived.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Message Status Breakdown */}
            <Card className="card-gradient hover-lift">
              <CardHeader>
                <CardTitle>Message Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Sent</span>
                    </div>
                    <span className="text-sm font-medium">{analytics.messagesSent}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Pending</span>
                    </div>
                    <span className="text-sm font-medium">{analytics.messagesPending}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Failed</span>
                    </div>
                    <span className="text-sm font-medium">{analytics.messagesFailed}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reply Analysis */}
            <Card className="card-gradient hover-lift">
              <CardHeader>
                <CardTitle>Reply Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Replies</span>
                    <span className="text-sm font-medium">{analytics.repliesReceived}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Positive Replies</span>
                    <span className="text-sm font-medium text-green-600">{analytics.positiveReplies}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Reply Rate</span>
                    <span className="text-sm font-medium">
                      {analytics.messagesSent > 0 
                        ? ((analytics.repliesReceived / analytics.messagesSent) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Campaign Progress */}
            <Card className="card-gradient hover-lift">
              <CardHeader>
                <CardTitle>Campaign Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Completion</span>
                      <span className="text-sm font-medium">
                        {analytics.totalLeads > 0 
                          ? ((analytics.messagesSent / analytics.totalLeads) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${analytics.totalLeads > 0 
                            ? (analytics.messagesSent / analytics.totalLeads) * 100
                            : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {analytics.messagesSent} of {analytics.totalLeads} leads processed
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Activity Chart */}
          {analytics.dailyStats && analytics.dailyStats.length > 0 && (
            <Card className="card-gradient hover-lift">
              <CardHeader>
                <CardTitle>Daily Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.dailyStats.map((day, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(day.date).toLocaleDateString()}
                        </span>
                        <div className="flex items-center space-x-4 text-xs text-gray-600">
                          <span className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>{day.sent} sent</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span>{day.failed} failed</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>{day.replies} replies</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Campaign Timeline */}
          <Card className="card-gradient hover-lift">
            <CardHeader>
              <CardTitle>Campaign Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Campaign Created</p>
                    <p className="text-xs text-gray-500">
                      {new Date(analytics.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {analytics.lastActivity && (
                  <div className="flex items-center space-x-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Last Activity</p>
                      <p className="text-xs text-gray-500">
                        {new Date(analytics.lastActivity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CampaignAnalytics;
