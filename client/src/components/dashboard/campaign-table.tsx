import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Pause, Eye, Edit, Filter, Download } from "lucide-react";
import { SiInstagram, SiFacebook } from "react-icons/si";

interface CampaignTableProps {
  campaigns?: any[];
}

export default function CampaignTable({ campaigns }: CampaignTableProps) {
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

  const getProgressPercentage = (messagesSent: number, totalTargets: number) => {
    if (totalTargets === 0) return 0;
    return Math.round((messagesSent / totalTargets) * 100);
  };

  return (
    <Card>
      <CardHeader className="border-b border-slate-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Campaign Management</CardTitle>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="text-slate-600">
              <Filter className="w-4 h-4 mr-1" />
              Filter
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-600">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!campaigns || campaigns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No campaigns to display</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Replies
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Positive
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {campaign.name}
                        </div>
                        <div className="text-sm text-slate-500">
                          {campaign.totalTargets} targets
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getPlatformIcon(campaign.platform)}
                        <span className="text-sm text-slate-900 ml-2 capitalize">
                          {campaign.platform}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getStatusVariant(campaign.status)} className="capitalize">
                        {campaign.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-slate-200 rounded-full h-2 mr-3">
                          <Progress 
                            value={getProgressPercentage(campaign.messagesSent, campaign.totalTargets)}
                            className="h-2"
                          />
                        </div>
                        <span className="text-sm text-slate-900">
                          {campaign.messagesSent}/{campaign.totalTargets}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {campaign.repliesReceived}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {campaign.positiveReplies}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {campaign.status === 'running' && (
                          <Button size="sm" variant="ghost" className="text-primary hover:text-primary/80">
                            <Pause className="w-3 h-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-600">
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-600">
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
