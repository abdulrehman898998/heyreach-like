import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Pause } from "lucide-react";
import { SiInstagram, SiFacebook } from "react-icons/si";

interface LiveActivityProps {
  campaigns?: any[];
}

export default function LiveActivity({ campaigns }: LiveActivityProps) {
  // Ensure campaigns is an array before using filter
  const campaignsArray = Array.isArray(campaigns) ? campaigns : [];
  const runningCampaigns = campaignsArray.filter(c => c.status === 'running') || [];

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

  const getEstimatedCompletion = (campaign: any) => {
    if (!campaign.startedAt || campaign.totalTargets === 0) return "Unknown";
    
    const startTime = new Date(campaign.startedAt).getTime();
    const now = Date.now();
    const elapsed = now - startTime;
    const progress = campaign.messagesSent / campaign.totalTargets;
    
    if (progress === 0) return "Calculating...";
    
    const estimatedTotal = elapsed / progress;
    const remaining = estimatedTotal - elapsed;
    const completionTime = new Date(now + remaining);
    
    return completionTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTimeElapsed = (startedAt: string) => {
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const diff = now - start;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ago`;
    }
    return `${minutes}m ago`;
  };

  return (
    <Card>
      <CardHeader className="border-b border-slate-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Live Campaign Activity</CardTitle>
          <Badge variant="secondary" className="bg-secondary/10 text-secondary">
            <div className="w-2 h-2 bg-secondary rounded-full animate-pulse mr-1"></div>
            {runningCampaigns.length} Running
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {runningCampaigns.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">No campaigns currently running</p>
          </div>
        ) : (
          <div className="space-y-4">
            {runningCampaigns.map((campaign) => (
              <div key={campaign.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-slate-900">{campaign.name}</h4>
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      {getPlatformIcon(campaign.platform)}
                      <span className="capitalize">{campaign.platform}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-secondary/10 text-secondary text-xs">
                      Running
                    </Badge>
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-600">
                      <Pause className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
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
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>
                    Started {campaign.startedAt ? getTimeElapsed(campaign.startedAt) : 'recently'}
                  </span>
                  <span>Est. completion: {getEstimatedCompletion(campaign)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
