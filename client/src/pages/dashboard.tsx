import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import StatsCards from "@/components/dashboard/stats-cards";
import LiveActivity from "@/components/dashboard/live-activity";
import RecentActivity from "@/components/dashboard/recent-activity";
import CampaignTable from "@/components/dashboard/campaign-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Info } from "lucide-react";
import { useState } from "react";
import NewCampaignModal from "@/components/modals/new-campaign-modal";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState(false);

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
  const { data: stats, error: statsError } = useQuery({
    queryKey: ["/api/analytics/stats"],
    enabled: isAuthenticated,
  });

  // Fetch campaigns
  const { data: campaigns, error: campaignsError } = useQuery({
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
        {/* Overview Stats */}
        <StatsCards stats={stats} campaigns={campaigns} />

        {/* Campaign Performance & Real-time Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Current Campaign Activity */}
          <div className="lg:col-span-2">
            <LiveActivity campaigns={campaigns} />
          </div>

          {/* Recent Activity Feed */}
          <RecentActivity activityLogs={activityLogs} />
        </div>

        {/* Campaign Management Table */}
        <CampaignTable campaigns={campaigns} />

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
