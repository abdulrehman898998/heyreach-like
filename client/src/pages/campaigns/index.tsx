import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Play, Eye, MoreHorizontal } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CampaignsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch campaigns
  const { data: campaignsData, isLoading } = useQuery({ 
    queryKey: ["/api/campaigns"],
    retry: false
  });
  
  const campaigns = campaignsData?.campaigns || [];

  // Execute campaign mutation
  const executeCampaignMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      return apiRequest(`/api/campaigns/${campaignId}/execute`, {
        method: 'POST'
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Campaign executed successfully",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
    },
    onError: (error: any) => {
      toast({
        title: "Execution failed",
        description: error.message || "Failed to execute campaign",
        variant: "destructive",
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExecute = (campaignId: number) => {
    executeCampaignMutation.mutate(campaignId);
  };

  const handleViewExecutions = (campaignId: number) => {
    setLocation(`/campaigns/${campaignId}/executions`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading campaigns...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">Manage your outreach campaigns</p>
        </div>
        <Button onClick={() => setLocation('/campaigns/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-medium">No campaigns yet</h3>
              <p className="text-muted-foreground">Create your first campaign to start automating outreach</p>
              <Button onClick={() => setLocation('/campaigns/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign: any) => (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {campaign.name}
                      <Badge className={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Created {new Date(campaign.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewExecutions(campaign.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Executions
                      </DropdownMenuItem>
                      {campaign.status === 'draft' && (
                        <DropdownMenuItem 
                          onClick={() => handleExecute(campaign.id)}
                          disabled={executeCampaignMutation.isPending}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Execute Campaign
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-1">Profile URL Template:</h4>
                    <p className="text-sm bg-gray-50 p-2 rounded border">
                      {campaign.profileUrlTemplate}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">Message Template:</h4>
                    <p className="text-sm bg-gray-50 p-2 rounded border">
                      {campaign.messageTemplate}
                    </p>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Total Leads: {campaign.totalLeads || 0}</span>
                    <span>Messages Sent: {campaign.messagesSent || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}