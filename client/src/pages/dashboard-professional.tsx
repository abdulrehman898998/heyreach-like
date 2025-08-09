import { useEffect } from "react";
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
  Settings,
  Zap
} from "lucide-react";

export default function DashboardProfessional() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // WebSocket connection for real-time updates
  useWebSocket((message) => {
    switch (message.type) {
      case 'campaign_update':
        toast({
          title: "Campaign Update",
          description: message.message,
        });
        break;
      case 'error':
        toast({
          title: "Error",
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const dashboardStats = stats?.stats || {};
  const campaignList = campaigns?.campaigns || [];
  const activityList = activityLogs?.logs || [];

  // Campaign table columns
  const campaignColumns = [
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
        <StatusBadge status={(value || 'pending') as any} />
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
  ];

  return (
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
            value={dashboardStats.totalMessages || 0}
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
            value={dashboardStats.activeCampaigns || 0}
            icon={Target}
            description="Currently running campaigns"
          />
          <StatsCard
            title="Success Rate"
            value={`${dashboardStats.successRate || 0}%`}
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
            value={dashboardStats.totalLeads || 0}
            icon={Users}
            description="Leads in your database"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DataTable
              title="Recent Campaigns"
              columns={campaignColumns}
              data={campaignList}
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
                {activityList.length === 0 ? (
                  <EmptyState
                    icon={<Activity className="h-8 w-8" />}
                    title="No recent activity"
                    description="Campaign activity will appear here"
                  />
                ) : (
                  <div className="space-y-3">
                    {activityList.slice(0, 5).map((activity: any, index: number) => (
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
  );
}