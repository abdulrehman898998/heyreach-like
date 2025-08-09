import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/ui/professional-card";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ProfessionalHeader } from "@/components/layout/professional-header";
import { 
  Plus, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Target,
  Activity,
  Settings,
  Zap,
  ArrowUpRight,
  Calendar,
  Clock
} from "lucide-react";

export default function DashboardNew() {
  const [, setLocation] = useLocation();

  // Fetch analytics stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/analytics/stats"],
  });

  // Fetch campaigns
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  // Fetch activity logs
  const { data: activityLogs } = useQuery({
    queryKey: ["/api/activity-logs"],
  });

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

  if (statsLoading && campaignsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const headerActions = (
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
  );

  return (
    <div className="min-h-screen bg-background">
      <ProfessionalHeader 
        title="Dashboard"
        subtitle="Overview of your outreach performance and activities"
        actions={headerActions}
      />
      
      <div className="p-6 space-y-8 animate-fade-in">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Messages"
            value={dashboardStats.totalMessages || 0}
            icon={<MessageSquare className="h-5 w-5 text-primary" />}
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
            icon={<Target className="h-5 w-5 text-primary" />}
            description="Currently running campaigns"
          />
          <StatsCard
            title="Success Rate"
            value={`${dashboardStats.successRate || 0}%`}
            icon={<TrendingUp className="h-5 w-5 text-primary" />}
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
            icon={<Users className="h-5 w-5 text-primary" />}
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
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Live Activity</h3>
              </div>
              
              {activityList.length === 0 ? (
                <EmptyState
                  icon={<Activity className="h-8 w-8" />}
                  title="No recent activity"
                  description="Campaign activity will appear here"
                />
              ) : (
                <div className="space-y-3">
                  {activityList.slice(0, 5).map((activity: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 text-sm animate-slide-up">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                      <div className="flex-1">
                        <div className="font-medium">{activity.action}</div>
                        <div className="text-muted-foreground text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-card rounded-lg border p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
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
              </div>
            </div>

            {/* Performance Insights */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Performance Insights</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Best performing time</span>
                  <span className="font-medium">2:00 PM - 4:00 PM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Top engagement day</span>
                  <span className="font-medium">Tuesday</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg. response time</span>
                  <span className="font-medium">2.5 hours</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-4">
                View Full Report
                <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}