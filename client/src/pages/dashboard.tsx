import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/ui/stats-card";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  Plus, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Target,
  Activity,
  Calendar,
  ExternalLink,
  Settings,
  Play,
  Pause,
  MoreHorizontal,
  Zap
} from "lucide-react";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // WebSocket for real-time updates
  useWebSocket((message) => {
    switch (message.type) {
      case 'message_sent':
        toast({
          title: "Message Sent",
          description: `Message sent to ${message.target} via ${message.account}`,
        });
        break;

      case 'campaign_completed':
        toast({
          title: "Campaign Completed",
          description: "Your campaign has finished successfully",
        });
        break;
      case 'campaign_error':
        toast({
          title: "Campaign Error",
          description: message.error,
          variant: "destructive",
        });
        break;
    }
  });

  // Fetch analytics stats
  const { data: stats, error: statsError, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/analytics/stats"],
    enabled: isAuthenticated,
  });

  // Fetch campaigns
  const { data: campaigns, error: campaignsError, isLoading: campaignsLoading } = useQuery({
    queryKey: ["/api/campaigns"],
    enabled: isAuthenticated,
  });

  // Fetch activity logs
  const { data: activityLogs, error: activityError } = useQuery({
    queryKey: ["/api/activity-logs"],
    enabled: isAuthenticated,
  });

  // Handle unauthorized errors
  useEffect(() => {
    const errors = [statsError, campaignsError, activityError].filter(Boolean);
    for (const error of errors) {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    }
  }, [statsError, campaignsError, activityError, toast]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex flex-col min-w-0 h-full">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600">Monitor your automation campaigns and performance</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Real-time Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-600">Live</span>
            </div>
            
            {/* Quick Actions */}
            <Button 
              onClick={() => setIsNewCampaignModalOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {/* Professional Dashboard Layout */}
        <div className="min-h-screen bg-background">
          <div className="flex flex-col space-y-8 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  <Zap className="h-8 w-8 text-blue-600" />
                  Dashboard
                </h1>
                <p className="text-muted-foreground">
                  Welcome back{user?.firstName ? `, ${user.firstName}` : ''}! Here's your campaign overview.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setLocation('/analytics')}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
                <Button onClick={() => setLocation('/campaigns/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Campaign
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Total Messages"
                value={stats?.stats?.totalMessages || 0}
                icon={MessageSquare}
                description="Messages sent this month"
                trend={{
                  value: 12,
                  label: "from last month",
                  isPositive: true
                }}
              />
              <StatsCard
                title="Active Campaigns"
                value={stats?.stats?.activeCampaigns || 0}
                icon={Target}
                description="Currently running campaigns"
              />
              <StatsCard
                title="Success Rate"
                value={`${stats?.stats?.successRate || 0}%`}
                icon={TrendingUp}
                description="Message delivery rate"
                trend={{
                  value: 5,
                  label: "from last week",
                  isPositive: true
                }}
              />
              <StatsCard
                title="Total Leads"
                value={stats?.stats?.totalLeads || 0}
                icon={Users}
                description="Leads in your database"
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <DataTable
                  title="Recent Campaigns"
                  columns={[
                    {
                      key: 'name',
                      title: 'Campaign',
                      render: (value: string) => (
                        <div className="font-medium">{value}</div>
                      )
                    },
                    {
                      key: 'status',
                      title: 'Status',
                      render: (value: string) => (
                        <StatusBadge status={value as any} />
                      )
                    },
                    {
                      key: 'leadsCount',
                      title: 'Leads',
                      render: (value: number) => (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {value || 0}
                        </div>
                      )
                    },
                    {
                      key: 'messagesSent',
                      title: 'Messages',
                      render: (value: number) => (
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {value || 0}
                        </div>
                      )
                    },
                    {
                      key: 'createdAt',
                      title: 'Created',
                      render: (value: string) => (
                        <div className="text-sm text-muted-foreground">
                          {new Date(value).toLocaleDateString()}
                        </div>
                      )
                    }
                  ]}
                  data={campaigns?.campaigns || []}
                  loading={campaignsLoading}
                  emptyState={{
                    icon: <Target className="h-12 w-12" />,
                    title: "No campaigns yet",
                    description: "Create your first campaign to start sending personalized messages",
                    action: (
                      <Button onClick={() => setLocation('/campaigns/create')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Campaign
                      </Button>
                    )
                  }}
                />
              </div>
              
              <div className="space-y-6">
                {/* Live Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Live Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!activityLogs?.logs || activityLogs.logs.length === 0 ? (
                      <EmptyState
                        icon={<Activity className="h-8 w-8" />}
                        title="No recent activity"
                        description="Campaign activity will appear here"
                      />
                    ) : (
                      <div className="space-y-3">
                        {activityLogs.logs.slice(0, 5).map((activity: any, index: number) => (
                          <div key={index} className="flex items-start gap-3 text-sm">
                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                            <div className="flex-1">
                              <div className="font-medium">{activity.action}</div>
                              <div className="text-muted-foreground text-xs">
                                {new Date(activity.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start" onClick={() => setLocation('/leads')}>
                      <Users className="h-4 w-4 mr-2" />
                      Upload Leads
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => setLocation('/accounts')}>
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Accounts
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => setLocation('/analytics')}>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      View Analytics
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
          </div>

          {/* Recent Activity Feed */}
          <RecentActivity activityLogs={activityLogs as any} />
        </div>

        {/* Campaign Management Table */}
        <CampaignTable campaigns={campaigns as any} />

        {/* Reply Tracking Information Panel */}
        <Card className="mt-8 border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <Info className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 mb-2">How Reply Tracking Works</h4>
                <div className="text-sm text-blue-700 space-y-2">
                  <p><strong>Automatic Detection:</strong> Our system monitors your connected accounts for new message notifications and automatically categorizes replies.</p>
                  <p><strong>Manual Classification:</strong> Use our browser extension or manual import to classify replies as positive, negative, or neutral.</p>
                  <p><strong>Integration Options:</strong> Connect with Zapier, webhook endpoints, or use our API to sync reply data from your CRM or other tools.</p>
                </div>
                <div className="mt-4 flex space-x-3">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Setup Reply Tracking
                  </Button>
                  <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                    Learn More
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* New Campaign Modal */}
      <NewCampaignModal 
        open={isNewCampaignModalOpen}
        onOpenChange={setIsNewCampaignModalOpen}
      />
    </div>
  );
}
