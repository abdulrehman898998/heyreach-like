import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Play, Pause, Eye, Edit, Copy, Trash2, Terminal, ChevronUp, ChevronDown } from "lucide-react";
import { SiInstagram, SiFacebook } from "react-icons/si";
import NewCampaignModal from "@/components/modals/new-campaign-modal";

export default function Campaigns() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // WebSocket connection for real-time logs
  useEffect(() => {
    if (!isAuthenticated) return;

    const addLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      setLogs(prev => [...prev.slice(-50), `[${timestamp}] ${message}`]); // Keep last 50 logs
    };

    // Simple polling for logs from console
    const interval = setInterval(async () => {
      try {
        // Extract logs from any running campaigns by checking their status
        const response = await fetch('/api/campaigns');
        const campaignsData = await response.json();
        const runningCampaign = campaignsData.find((c: any) => c.status === 'running');
        
        if (runningCampaign) {
          // Simple status update
          addLog(`Campaign "${runningCampaign.name}" is processing Instagram profiles...`);
        }
      } catch (error) {
        // Ignore polling errors
      }
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(interval);
    };
  }, [isAuthenticated]);

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

  // Fetch campaigns
  const { data: campaigns, error: campaignsError, isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ["/api/campaigns"],
    enabled: isAuthenticated,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (campaignsError && isUnauthorizedError(campaignsError as Error)) {
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
  }, [campaignsError, toast]);

  // Start campaign mutation
  const startCampaignMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      await apiRequest("POST", `/api/campaigns/${campaignId}/start`);
    },
    onSuccess: () => {
      toast({
        title: "Campaign Started",
        description: "Your campaign is now running",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (error) => {
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
      toast({
        title: "Error",
        description: "Failed to start campaign",
        variant: "destructive",
      });
    },
  });

  // Pause campaign mutation
  const pauseCampaignMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      await apiRequest("POST", `/api/campaigns/${campaignId}/pause`);
    },
    onSuccess: () => {
      toast({
        title: "Campaign Paused",
        description: "Your campaign has been paused",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (error) => {
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
      toast({
        title: "Error",
        description: "Failed to pause campaign",
        variant: "destructive",
      });
    },
  });

  // Delete campaign mutation
  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      await apiRequest("DELETE", `/api/campaigns/${campaignId}`);
    },
    onSuccess: () => {
      toast({
        title: "Campaign Deleted",
        description: "Campaign has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (error) => {
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
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive",
      });
    },
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'running':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'paused':
        return 'outline';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <SiInstagram className="w-4 h-4 text-pink-500" />;
      case 'facebook':
        return <SiFacebook className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getProgressPercentage = (messagesSent: number, totalTargets: number) => {
    if (totalTargets === 0) return 0;
    return Math.round((messagesSent / totalTargets) * 100);
  };

  if (isLoading || isLoadingCampaigns) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading campaigns...</p>
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
            <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
            <p className="text-slate-600">Manage and monitor your automation campaigns</p>
          </div>
          <Button 
            onClick={() => setIsNewCampaignModalOpen(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {!campaigns || campaigns.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Play className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No campaigns yet</h3>
              <p className="text-slate-600 text-center mb-4">
                Create your first automation campaign to start sending messages
              </p>
              <Button 
                onClick={() => setIsNewCampaignModalOpen(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {campaigns.map((campaign: any) => (
              <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        {getPlatformIcon(campaign.platform)}
                        <span className="text-sm text-slate-600 capitalize">
                          {campaign.platform}
                        </span>
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600">Progress</span>
                        <span className="font-medium">
                          {campaign.messagesSent}/{campaign.totalTargets} messages
                        </span>
                      </div>
                      <Progress 
                        value={getProgressPercentage(campaign.messagesSent, campaign.totalTargets)} 
                        className="h-2"
                      />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Replies</p>
                        <p className="font-semibold">{campaign.repliesReceived}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Positive</p>
                        <p className="font-semibold text-secondary">{campaign.positiveReplies}</p>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="text-xs text-slate-500">
                      {campaign.startedAt && (
                        <p>Started: {new Date(campaign.startedAt).toLocaleDateString()}</p>
                      )}
                      {campaign.completedAt && (
                        <p>Completed: {new Date(campaign.completedAt).toLocaleDateString()}</p>
                      )}
                      {!campaign.startedAt && (
                        <p>Created: {new Date(campaign.createdAt).toLocaleDateString()}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                      <div className="flex items-center space-x-2">
                        {campaign.status === 'running' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => pauseCampaignMutation.mutate(campaign.id)}
                            disabled={pauseCampaignMutation.isPending}
                          >
                            <Pause className="w-3 h-3" />
                          </Button>
                        ) : campaign.status === 'draft' || campaign.status === 'paused' ? (
                          <Button
                            size="sm"
                            onClick={() => startCampaignMutation.mutate(campaign.id)}
                            disabled={startCampaignMutation.isPending}
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                        ) : null}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => window.open(`/campaigns/${campaign.id}`, '_blank')}
                          title="View details"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => toast({ title: "Edit Feature", description: "Campaign editing coming soon!" })}
                          title="Edit campaign"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(`Campaign: ${campaign.name}\nPlatform: ${campaign.platform}\nProgress: ${campaign.messagesSent}/${campaign.totalTargets}`);
                            toast({ title: "Copied", description: "Campaign details copied to clipboard" });
                          }}
                          title="Copy details"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete "${campaign.name}"? This action cannot be undone.`)) {
                              deleteCampaignMutation.mutate(campaign.id);
                            }
                          }}
                          disabled={deleteCampaignMutation.isPending}
                          title="Delete campaign"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Processing Status */}
      {campaigns && campaigns.some((c: any) => c.status === 'running') && (
        <div className="border-t border-slate-200 bg-blue-50 px-6 py-3">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-blue-700 font-medium">
              Processing Instagram profiles...
            </span>
            {logs.length > 0 && (
              <span className="text-xs text-blue-600">
                {logs[logs.length - 1].replace(/^\[.*?\]\s*/, '')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* New Campaign Modal */}
      <NewCampaignModal 
        open={isNewCampaignModalOpen}
        onOpenChange={setIsNewCampaignModalOpen}
      />
    </div>
  );
}
