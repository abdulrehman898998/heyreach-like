import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Reply, Play, ThumbsUp } from "lucide-react";

interface RecentActivityProps {
  activityLogs?: any[];
}

export default function RecentActivity({ activityLogs }: RecentActivityProps) {
  // Ensure activityLogs is an array before using slice
  const activityLogsArray = Array.isArray(activityLogs) ? activityLogs : [];

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'message_sent':
        return <Check className="w-4 h-4 text-secondary" />;
      case 'reply_received':
        return <Reply className="w-4 h-4 text-accent" />;
      case 'campaign_started':
        return <Play className="w-4 h-4 text-primary" />;
      case 'positive_reply':
        return <ThumbsUp className="w-4 h-4 text-secondary" />;
      default:
        return <Check className="w-4 h-4 text-slate-500" />;
    }
  };

  const getActivityIconBg = (action: string) => {
    switch (action) {
      case 'message_sent':
        return 'bg-secondary/10';
      case 'reply_received':
        return 'bg-accent/10';
      case 'campaign_started':
        return 'bg-primary/10';
      case 'positive_reply':
        return 'bg-secondary/10';
      default:
        return 'bg-slate-100';
    }
  };

  const formatActivityMessage = (log: any) => {
    switch (log.action) {
      case 'message_sent':
        return (
          <>
            Message sent via automation
            <br />
            <span className="text-xs text-slate-500">
              {log.details || 'Automated message delivery'}
            </span>
          </>
        );
      case 'reply_received':
        return (
          <>
            New reply received
            <br />
            <span className="text-xs text-slate-500">
              {log.details || 'Reply from prospect'}
            </span>
          </>
        );
      case 'campaign_started':
        return (
          <>
            Campaign started
            <br />
            <span className="text-xs text-slate-500">
              {log.details || 'Automation campaign initiated'}
            </span>
          </>
        );
      default:
        return (
          <>
            {log.action.replace(/_/g, ' ')}
            <br />
            <span className="text-xs text-slate-500">
              {log.details || 'System activity'}
            </span>
          </>
        );
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <Card>
      <CardHeader className="border-b border-slate-200">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {activityLogsArray.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activityLogsArray.slice(0, 6).map((log) => (
              <div key={log.id} className="flex items-start space-x-3">
                <div className={`w-8 h-8 ${getActivityIconBg(log.action)} rounded-full flex items-center justify-center flex-shrink-0`}>
                  {getActivityIcon(log.action)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-900">
                    {formatActivityMessage(log)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {getTimeAgo(log.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
