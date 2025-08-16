import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import VariableInput from '@/components/ui/variable-input';
import { ArrowLeft, Save, Users, MessageSquare, Settings, Play, Clock, Eye } from 'lucide-react';

interface Campaign {
  id: number;
  name: string;
  leadFileId: number;
  profileUrlColumn: string;
  messageColumn: string;
  messageTemplate: string;
  accountIds: number[];
  maxMessagesPerDay: number;
  delayBetweenMessages: number;
  status: string;
}

interface LeadFile {
  id: number;
  name: string;
  columnNames: string[];
  totalRows: number;
}

interface InstagramAccount {
  id: number;
  username: string;
  status: string;
  healthScore: number;
}

const EditCampaign: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leadFiles, setLeadFiles] = useState<LeadFile[]>([]);
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Get campaign ID from URL
  const campaignId = window.location.pathname.split('/')[2];

  useEffect(() => {
    fetchCampaignData();
  }, [campaignId]);

  const fetchCampaignData = async () => {
    try {
      // Fetch campaign details
      const campaignResponse = await fetch(`/api/campaigns/${campaignId}`);
      const campaignData = await campaignResponse.json();
      
      if (campaignData.success) {
        setCampaign(campaignData.campaign);
      }

      // Fetch lead files
      const leadsResponse = await fetch('/api/lead-files');
      const leadsData = await leadsResponse.json();
      if (leadsData.success) {
        setLeadFiles(leadsData.leadFiles.map((file: any) => ({
          id: file.id,
          name: file.name,
          columnNames: file.columnNames || [],
          totalRows: file.rowCount || 0
        })));
      }

      // Fetch accounts
      const accountsResponse = await fetch('/api/accounts');
      const accountsData = await accountsResponse.json();
      if (accountsData.success) {
        setAccounts(accountsData.data.filter((a: InstagramAccount) => a.status === 'active'));
      }
    } catch (error) {
      console.error('Error fetching campaign data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load campaign data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewVariables = async () => {
    if (!campaign || !campaign.leadFileId || (!campaign.messageTemplate && !campaign.messageColumn)) {
      toast({
        title: "Preview Error",
        description: "Please select a lead file and add a message template or column first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingPreview(true);
    try {
      const response = await fetch(`/api/leads/files/${campaign.leadFileId}/leads`);
      const data = await response.json();
      
      if (!data.success || !data.leads || data.leads.length === 0) {
        toast({
          title: "Preview Error",
          description: "No leads found in the selected file.",
          variant: "destructive",
        });
        return;
      }

      const sampleLeads = data.leads.slice(0, 3);
      const processedLeads = [];

      for (const lead of sampleLeads) {
        let template = campaign.messageTemplate;
        
        if (campaign.messageColumn && !campaign.messageTemplate) {
          template = lead.customFields[campaign.messageColumn] || '';
        }

        if (!template) continue;

        const testResponse = await fetch('/api/test-variables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template,
            leadData: lead
          })
        });

        const testData = await testResponse.json();
        
        if (testData.success) {
          processedLeads.push({
            original: lead,
            processed: testData.processedMessage,
            variables: testData.variables,
            profileUrl: lead.customFields[campaign.profileUrlColumn] || lead.profileUrl
          });
        }
      }

      setPreviewData(processedLeads);
      setShowPreview(true);
      
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        title: "Preview Error",
        description: "Failed to generate preview. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSave = async () => {
    if (!campaign) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Campaign updated successfully',
        });
        setLocation('/campaigns');
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update campaign',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to update campaign',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Campaign Not Found</h2>
          <p className="text-gray-600 mb-4">The campaign you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation('/campaigns')}>
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  const selectedLeadFile = leadFiles.find(f => f.id === campaign.leadFileId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => setLocation('/campaigns')}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Edit Campaign</h1>
                <p className="text-sm text-gray-600">Modify your Instagram outreach campaign</p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="primary-gradient"
            >
              {saving ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="space-y-6">
          {/* Campaign Name */}
          <Card className="card-gradient hover-lift">
            <CardHeader>
              <CardTitle>Campaign Name</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={campaign.name}
                onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                placeholder="Enter campaign name"
              />
            </CardContent>
          </Card>

          {/* Lead File Selection */}
          <Card className="card-gradient hover-lift">
            <CardHeader>
              <CardTitle>Lead File</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leadFiles.map((file) => (
                  <div key={file.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={campaign.leadFileId === file.id}
                      onCheckedChange={(checked) => {
                        setCampaign({ ...campaign, leadFileId: checked ? file.id : 0 });
                      }}
                    />
                    <div>
                      <label className="text-sm font-medium">{file.name}</label>
                      <div className="text-xs text-gray-500">{file.totalRows} leads • {file.columnNames.length} columns</div>
                    </div>
                  </div>
                ))}
                
                {selectedLeadFile && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium text-blue-900 mb-2">Available columns:</div>
                    <div className="text-xs text-blue-700">
                      {selectedLeadFile.columnNames.map(col => (
                        <span key={col} className="inline-block bg-blue-100 px-2 py-1 rounded mr-2 mb-1">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Message Configuration */}
          <Card className="card-gradient hover-lift">
            <CardHeader>
              <CardTitle>Message Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="profile-url">Profile URL Column</Label>
                  <VariableInput
                    value={campaign.profileUrlColumn}
                    onChange={(value) => setCampaign({ ...campaign, profileUrlColumn: value })}
                    placeholder="Type / to select column"
                    suggestions={selectedLeadFile?.columnNames || []}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message-column">Message Column (Optional)</Label>
                  <VariableInput
                    value={campaign.messageColumn}
                    onChange={(value) => setCampaign({ ...campaign, messageColumn: value })}
                    placeholder="Type / to select message column"
                    suggestions={selectedLeadFile?.columnNames || []}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message-template">Message Template</Label>
                <VariableInput
                  value={campaign.messageTemplate}
                  onChange={(value) => setCampaign({ ...campaign, messageTemplate: value })}
                  placeholder="Type / to use variables from your leads"
                  suggestions={selectedLeadFile?.columnNames || []}
                  multiline={true}
                />
              </div>

              {/* Preview Button */}
              <div className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreviewVariables}
                  disabled={isLoadingPreview || !campaign.leadFileId || (!campaign.messageTemplate && !campaign.messageColumn)}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  {isLoadingPreview ? 'Generating Preview...' : 'Preview Variables'}
                </Button>
              </div>

              {/* Preview Results */}
              {showPreview && previewData.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Variable Preview (First 3 leads):</h4>
                  <div className="space-y-4">
                    {previewData.map((item, index) => (
                      <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-sm font-medium text-blue-900">
                            Lead {index + 1}: {item.original.customFields?.Username || 'Unknown'}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowPreview(false)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </Button>
                        </div>
                        <div className="text-xs text-blue-700 mb-2">
                          <strong>Profile URL:</strong> {item.profileUrl}
                        </div>
                        <div className="text-sm text-blue-800 mb-2">
                          <strong>Original Template:</strong>
                          <div className="mt-1 p-2 bg-white rounded border text-gray-700">
                            {campaign.messageTemplate || `Column: ${campaign.messageColumn}`}
                          </div>
                        </div>
                        <div className="text-sm text-blue-800">
                          <strong>Processed Message:</strong>
                          <div className="mt-1 p-2 bg-white rounded border text-gray-700">
                            {item.processed}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Campaign Settings */}
          <Card className="card-gradient hover-lift">
            <CardHeader>
              <CardTitle>Campaign Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max-messages">Max Messages Per Day</Label>
                  <Input
                    id="max-messages"
                    type="number"
                    value={campaign.maxMessagesPerDay}
                    onChange={(e) => setCampaign({ ...campaign, maxMessagesPerDay: Number(e.target.value) })}
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <Label htmlFor="delay">Delay Between Messages (seconds)</Label>
                  <Input
                    id="delay"
                    type="number"
                    value={campaign.delayBetweenMessages}
                    onChange={(e) => setCampaign({ ...campaign, delayBetweenMessages: Number(e.target.value) })}
                    min="10"
                    max="300"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EditCampaign;
