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

      {/* Quick Actions */}
      <div className="card-professional">
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            <p className="text-sm text-gray-600">Get started with your outreach</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => setLocation('/leads')}
              className="h-24 flex flex-col items-center justify-center gap-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
            >
              <Upload className="h-6 w-6 text-blue-600" />
              <div className="text-center">
                <div className="font-medium text-gray-900">Upload Leads</div>
                <div className="text-xs text-gray-500">Import CSV with profiles</div>
              </div>
            </button>
            
            <button 
              onClick={() => setLocation('/campaigns')}
              className="h-24 flex flex-col items-center justify-center gap-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all duration-200"
            >
              <Target className="h-6 w-6 text-green-600" />
              <div className="text-center">
                <div className="font-medium text-gray-900">Manage Campaigns</div>
                <div className="text-xs text-gray-500">Create and execute campaigns</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="card-professional">
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Campaigns</h3>
          </div>
          {totalCampaigns === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="font-medium">No campaigns yet</p>
              <p className="text-sm">Create your first campaign to start automating outreach</p>
              <button 
                onClick={() => setLocation('/campaigns/create')} 
                className="btn-primary mt-4"
              >
                Create Campaign
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {campaignsData?.campaigns?.slice(0, 3).map((campaign: any) => (
                <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <div className="font-medium text-gray-900">{campaign.name}</div>
                    <div className="text-sm text-gray-500">
                      {campaign.messagesSent || 0} messages sent • {campaign.status}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(campaign.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
              <button 
                onClick={() => setLocation('/campaigns')} 
                className="w-full text-blue-600 hover:text-blue-700 py-2 text-sm font-medium"
              >
                View all campaigns
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}