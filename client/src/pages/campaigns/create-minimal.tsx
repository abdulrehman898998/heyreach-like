import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MinimalHeader } from "@/components/layout/minimal-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";

export default function CreateCampaignMinimal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [message, setMessage] = useState("");
  const [selectedLeadFileId, setSelectedLeadFileId] = useState<number | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);

  // Fetch data
  const { data: leadsData } = useQuery({ queryKey: ["/api/leads"] });
  const { data: accountsData } = useQuery({ queryKey: ["/api/accounts"] });

  const leadFiles = Array.isArray(leadsData) ? leadsData : [];
  const accounts = Array.isArray(accountsData) ? accountsData : [];

  // Create campaign mutation
  const createMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        body: JSON.stringify(campaignData),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error('Campaign creation failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Success",
        description: "Campaign created successfully",
      });
      setLocation("/campaigns");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!campaignName || !profileUrl || !message || !selectedLeadFileId || selectedAccounts.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      name: campaignName,
      profileUrl,
      message,
      leadFileId: selectedLeadFileId,
      accountIds: selectedAccounts,
    });
  };

  const headerActions = (
    <Button variant="outline" onClick={() => setLocation('/campaigns')}>
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back
    </Button>
  );

  return (
    <div className="min-h-screen">
      <MinimalHeader 
        title="Create Campaign"
        subtitle="Set up a new outreach campaign"
        actions={headerActions}
      />
      
      <div className="p-6 max-w-2xl animate-fade-in">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campaign Name */}
          <Card className="card-gradient hover-lift">
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Campaign Name</label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Enter campaign name"
                />
              </div>
            </CardContent>
          </Card>

          {/* Lead File Selection */}
          <Card className="card-gradient hover-lift">
            <CardHeader>
              <CardTitle>Lead File</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leadFiles.length === 0 ? (
                  <div className="text-sm text-gray-600">
                    No lead files available. <Button variant="link" onClick={() => setLocation('/leads')}>Upload leads</Button>
                  </div>
                ) : (
                  leadFiles.map((file: any) => (
                    <div key={file.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedLeadFileId === file.id}
                        onCheckedChange={(checked) => {
                          setSelectedLeadFileId(checked ? file.id : null);
                        }}
                      />
                      <label className="text-sm">{file.name} ({file.totalRows} leads)</label>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Templates */}
          <Card className="card-gradient hover-lift">
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Profile URL Template</label>
                <Input
                  value={profileUrl}
                  onChange={(e) => setProfileUrl(e.target.value)}
                  placeholder="Use column variables like {{Profiles}}"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Message Template</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Use column variables like {{messages}}"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Selection */}
          <Card className="card-gradient hover-lift">
            <CardHeader>
              <CardTitle>Instagram Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {accounts.length === 0 ? (
                  <div className="text-sm text-gray-600">
                    No accounts available. <Button variant="link" onClick={() => setLocation('/accounts')}>Connect accounts</Button>
                  </div>
                ) : (
                  accounts.map((account: any) => (
                    <div key={account.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedAccounts.includes(account.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAccounts([...selectedAccounts, account.id]);
                          } else {
                            setSelectedAccounts(selectedAccounts.filter(id => id !== account.id));
                          }
                        }}
                      />
                      <label className="text-sm">@{account.username}</label>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <Button 
            type="submit" 
            className="w-full primary-gradient"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Campaign
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}