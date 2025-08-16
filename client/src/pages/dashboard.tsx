import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Target, Users, BarChart3, TrendingUp, MessageSquare } from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  // Fetch dashboard data
  const { data: leadsData } = useQuery({ 
    queryKey: ["/api/leads"],
    retry: false
  });
  
  const { data: campaignsData } = useQuery({ 
    queryKey: ["/api/campaigns"],
    retry: false
  });

  const totalLeads = leadsData?.leads?.length || 0;
  const totalCampaigns = campaignsData?.campaigns?.length || 0;
  const activeCampaigns = campaignsData?.campaigns?.filter((c: any) => c.status === 'running')?.length || 0;
  const totalMessagesSent = campaignsData?.campaigns?.reduce((sum: number, c: any) => sum + (c.messagesSent || 0), 0) || 0;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Monitor your social media outreach performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-professional">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">{totalLeads}</p>
                <p className="text-xs text-gray-500 mt-1">Uploaded profiles</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card-professional">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Campaigns</p>
                <p className="text-2xl font-bold text-gray-900">{totalCampaigns}</p>
                <p className="text-xs text-gray-500 mt-1">Total created</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card-professional">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{activeCampaigns}</p>
                <p className="text-xs text-gray-500 mt-1">Currently running</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="card-professional">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Messages Sent</p>
                <p className="text-2xl font-bold text-gray-900">{totalMessagesSent}</p>
                <p className="text-xs text-gray-500 mt-1">Total outreach</p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}