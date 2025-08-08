import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Users, CheckCircle, Play, TrendingUp } from "lucide-react";

interface StatsCardsProps {
  stats?: {
    totalMessagesSent: number;
    activeCampaigns: number;
  };
  campaigns?: any[];
}

export default function StatsCards({ stats, campaigns }: StatsCardsProps) {
  // Ensure campaigns is an array before using filter
  const campaignsArray = Array.isArray(campaigns) ? campaigns : [];
  const completedCampaigns = campaignsArray.filter(c => c.status === 'completed').length || 0;
  const totalCampaigns = campaignsArray.length || 0;
  
  const cards = [
    {
      title: "Messages Sent",
      value: stats?.totalMessagesSent?.toLocaleString() || "0",
      growth: "Total messages delivered",
      icon: MessageSquare,
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Total Campaigns",
      value: totalCampaigns.toString(),
      growth: "Automation campaigns created",
      icon: Users,
      bgColor: "bg-secondary/10",
      iconColor: "text-secondary",
    },
    {
      title: "Completed",
      value: completedCampaigns.toString(),
      growth: `${totalCampaigns > 0 ? ((completedCampaigns / totalCampaigns) * 100).toFixed(1) : 0}% success rate`,
      icon: CheckCircle,
      bgColor: "bg-accent/10",
      iconColor: "text-accent",
    },
    {
      title: "Active Campaigns",
      value: stats?.activeCampaigns?.toString() || "0",
      growth: "Currently running",
      icon: Play,
      bgColor: "bg-slate-100",
      iconColor: "text-slate-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{card.title}</p>
                  <p className="text-3xl font-bold text-slate-900">{card.value}</p>
                  <p className="text-sm text-secondary mt-1">
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    {card.growth}
                  </p>
                </div>
                <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
