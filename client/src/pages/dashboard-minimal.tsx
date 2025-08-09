import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { MinimalHeader } from "@/components/layout/minimal-header";
import { 
  Plus, 
  TrendingUp, 
  Target,
  Upload
} from "lucide-react";

export default function DashboardMinimal() {
  const [, setLocation] = useLocation();

  // Fetch data
  const { data: stats } = useQuery({ queryKey: ["/api/analytics/stats"] });

  const dashboardStats = stats || {};

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

        {/* Quick Actions */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <Button 
                onClick={() => setLocation('/leads')}
                variant="outline"
                className="h-16 flex flex-col gap-2 hover-lift"
              >
                <Upload className="h-5 w-5" />
                <span>Upload Leads</span>
              </Button>
              <Button 
                onClick={() => setLocation('/campaigns/create')}
                variant="outline"
                className="h-16 flex flex-col gap-2 hover-lift"
              >
                <Target className="h-5 w-5" />
                <span>Create Campaign</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}