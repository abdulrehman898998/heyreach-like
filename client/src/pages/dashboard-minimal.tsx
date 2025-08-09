import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MinimalHeader } from "@/components/layout/minimal-header";
import { 
  Plus, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Target
} from "lucide-react";

export default function DashboardMinimal() {
  const [, setLocation] = useLocation();

  // Fetch data
  const { data: stats } = useQuery({ queryKey: ["/api/analytics/stats"] });
  const { data: campaigns, isLoading } = useQuery({ queryKey: ["/api/campaigns"] });

  const dashboardStats = stats || {};
  const campaignList = Array.isArray(campaigns) ? campaigns : [];

  // Campaign table columns
  const campaignColumns = [
    {
      key: 'name',
      title: 'Campaign',
      render: (value: string) => <span className="font-medium">{value}</span>
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => <StatusBadge status={(value || 'pending') as any} />
    },
    {
      key: 'leadsCount',
      title: 'Leads',
      render: (value: number) => <span>{value || 0}</span>
    },
    {
      key: 'messagesSent',
      title: 'Messages',
      render: (value: number) => <span>{value || 0}</span>
    }
  ];

  const headerActions = (
    <Button onClick={() => setLocation('/campaigns/create')}>
      <Plus className="h-4 w-4 mr-2" />
      New Campaign
    </Button>
  );

  return (
    <div className="min-h-screen">
      <MinimalHeader 
        title="Dashboard"
        subtitle="Outreach platform overview"
        actions={headerActions}
      />
      
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="card-gradient hover-lift">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{dashboardStats.totalMessages || 0}</div>
            </CardContent>
          </Card>

          <Card className="card-gradient hover-lift">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{dashboardStats.activeCampaigns || 0}</div>
            </CardContent>
          </Card>

          <Card className="card-gradient hover-lift">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{dashboardStats.successRate || 0}%</div>
            </CardContent>
          </Card>

          <Card className="card-gradient hover-lift">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{dashboardStats.totalLeads || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns Table */}
        <DataTable
          title="Recent Campaigns"
          columns={campaignColumns}
          data={campaignList}
          loading={isLoading}
          emptyState={{
            icon: <Target className="h-12 w-12" />,
            title: "No campaigns",
            description: "Create your first campaign to get started",
            action: (
              <Button onClick={() => setLocation('/campaigns/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            )
          }}
        />
      </div>
    </div>
  );
}