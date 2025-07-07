import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Reply, ThumbsUp, Play, TrendingUp, TrendingDown } from "lucide-react";

export default function Analytics() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

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

  // Fetch analytics stats
  const { data: stats, error: statsError, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/analytics/stats"],
    enabled: isAuthenticated,
  });

  // Fetch campaigns for additional metrics
  const { data: campaigns, error: campaignsError } = useQuery({
    queryKey: ["/api/campaigns"],
    enabled: isAuthenticated,
  });

  // Handle unauthorized errors
  useEffect(() => {
    const errors = [statsError, campaignsError].filter(Boolean);
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
  }, [statsError, campaignsError, toast]);

  if (isLoading || isLoadingStats) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  const getConversionRate = () => {
    if (!stats || stats.totalMessagesSent === 0) return "0.0";
    return ((stats.totalPositiveReplies / stats.totalMessagesSent) * 100).toFixed(1);
  };

  const getReplyRate = () => {
    if (!stats || stats.totalMessagesSent === 0) return "0.0";
    return ((stats.totalRepliesReceived / stats.totalMessagesSent) * 100).toFixed(1);
  };

  const getCompletedCampaigns = () => {
    if (!campaigns) return 0;
    return campaigns.filter((c: any) => c.status === 'completed').length;
  };

  const getTotalCampaigns = () => {
    return campaigns?.length || 0;
  };

  return (
    <div className="flex flex-col min-w-0 h-full">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
            <p className="text-slate-600">Track your automation performance and insights</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Messages Sent */}
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Messages Sent</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {stats?.totalMessagesSent?.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-secondary mt-1">
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    All time total
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Replies */}
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Replies</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {stats?.totalRepliesReceived?.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-secondary mt-1">
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    {getReplyRate()}% reply rate
                  </p>
                </div>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <Reply className="w-6 h-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Positive Replies */}
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Positive Replies</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {stats?.totalPositiveReplies?.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-accent mt-1">
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    {getConversionRate()}% conversion rate
                  </p>
                </div>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <ThumbsUp className="w-6 h-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Campaigns */}
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Campaigns</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {stats?.activeCampaigns || '0'}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {getCompletedCampaigns()}/{getTotalCampaigns()} completed
                  </p>
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Play className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Conversion Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Conversion Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Reply Rate</span>
                  <span className="font-semibold">{getReplyRate()}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-secondary h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${getReplyRate()}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Positive Conversion</span>
                  <span className="font-semibold">{getConversionRate()}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-accent h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${getConversionRate()}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Campaign Completion</span>
                  <span className="font-semibold">
                    {getTotalCampaigns() > 0 ? Math.round((getCompletedCampaigns() / getTotalCampaigns()) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${getTotalCampaigns() > 0 ? (getCompletedCampaigns() / getTotalCampaigns()) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Platform Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {!campaigns || campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500">No campaign data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Instagram Stats */}
                  {campaigns.some((c: any) => c.platform === 'instagram') && (
                    <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                          <MessageSquare className="w-4 h-4 text-pink-600" />
                        </div>
                        <span className="font-medium">Instagram</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {campaigns
                            .filter((c: any) => c.platform === 'instagram')
                            .reduce((sum: number, c: any) => sum + c.messagesSent, 0)
                            .toLocaleString()}
                        </p>
                        <p className="text-sm text-slate-600">messages sent</p>
                      </div>
                    </div>
                  )}

                  {/* Facebook Stats */}
                  {campaigns.some((c: any) => c.platform === 'facebook') && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <MessageSquare className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium">Facebook</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {campaigns
                            .filter((c: any) => c.platform === 'facebook')
                            .reduce((sum: number, c: any) => sum + c.messagesSent, 0)
                            .toLocaleString()}
                        </p>
                        <p className="text-sm text-slate-600">messages sent</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Campaign Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Campaign Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {!campaigns || campaigns.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500">No campaigns to display</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Campaign</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Platform</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Sent</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Replies</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Positive</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.slice(0, 5).map((campaign: any) => (
                      <tr key={campaign.id} className="border-b border-slate-100">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-slate-900">{campaign.name}</p>
                            <p className="text-sm text-slate-500">{campaign.status}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 capitalize">{campaign.platform}</td>
                        <td className="py-3 px-4">{campaign.messagesSent}</td>
                        <td className="py-3 px-4">{campaign.repliesReceived}</td>
                        <td className="py-3 px-4">{campaign.positiveReplies}</td>
                        <td className="py-3 px-4">
                          {campaign.messagesSent > 0 ? 
                            `${((campaign.positiveReplies / campaign.messagesSent) * 100).toFixed(1)}%` : 
                            '0%'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
