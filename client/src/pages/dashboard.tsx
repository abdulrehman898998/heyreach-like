import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Target, TrendingUp, Users } from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  // Fetch analytics data
  const { data: statsData } = useQuery({ 
    queryKey: ["/api/analytics/stats"],
    retry: false
  });
  
  const stats = statsData?.stats || {
    totalMessages: 0,
    activeCampaigns: 0,
    successRate: 0,
    totalLeads: 0
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your outreach automation</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMessages}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCampaigns}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button 
              onClick={() => setLocation('/leads')}
              variant="outline"
              className="h-20 flex flex-col gap-2"
            >
              <Upload className="h-6 w-6" />
              <span className="font-medium">Upload Leads</span>
              <span className="text-xs text-muted-foreground">Import CSV with profiles</span>
            </Button>
            
            <Button 
              onClick={() => setLocation('/campaigns')}
              variant="outline"
              className="h-20 flex flex-col gap-2"
            >
              <Target className="h-6 w-6" />
              <span className="font-medium">Manage Campaigns</span>
              <span className="text-xs text-muted-foreground">View and execute campaigns</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}