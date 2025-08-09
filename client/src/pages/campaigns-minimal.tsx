import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MinimalHeader } from "@/components/layout/minimal-header";
import { Plus, Target, Users, MessageSquare } from "lucide-react";

export default function CampaignsMinimal() {
  const [, setLocation] = useLocation();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const campaignList = campaigns || [];

  const columns = [
    {
      key: 'name',
      title: 'Campaign',
      render: (value: string) => <span className="font-medium">{value}</span>
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => <StatusBadge status={(value || 'pending') as any} />
    },
    {
      key: 'leadsCount',
      title: 'Leads',
      render: (value: number) => (
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {value || 0}
        </div>
      )
    },
    {
      key: 'messagesSent',
      title: 'Messages',
      render: (value: number) => (
        <div className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          {value || 0}
        </div>
      )
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (value: string) => (
        <span className="text-gray-600">
          {new Date(value).toLocaleDateString()}
        </span>
      )
    }
  ];

  const headerActions = (
    <Button onClick={() => setLocation('/campaigns/create')}>
      <Plus className="h-4 w-4 mr-2" />
      New Campaign
    </Button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <MinimalHeader 
        title="Campaigns"
        subtitle="Manage your outreach campaigns"
        actions={headerActions}
      />
      
      <div className="p-6">
        <DataTable
          columns={columns}
          data={campaignList}
          loading={isLoading}
          emptyState={{
            icon: <Target className="h-12 w-12" />,
            title: "No campaigns",
            description: "Create your first campaign to start sending messages",
            action: (
              <Button onClick={() => setLocation('/campaigns/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            )
          }}
        />
      </div>
    </div>
  );
}