import React, { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { ArrowLeft, Save, ChevronRight, Users, MessageSquare, Settings, Play, Clock, Eye } from 'lucide-react';

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

interface CampaignForm {
  name: string;
  leadFileId: number | null;
  profileUrlColumn: string;
  messageColumn: string;
  messageTemplate: string;
  selectedAccounts: number[];
  maxMessagesPerDay: number;
  delayBetweenMessages: number;
  scheduleType: 'now' | 'later';
  startDate: string;
  startTime: string;
}

const CreateCampaign: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  const [formData, setFormData] = useState<CampaignForm>({
    name: '',
    leadFileId: null,
    profileUrlColumn: '',
    messageColumn: '',
    messageTemplate: '',
    selectedAccounts: [],
    maxMessagesPerDay: 50,
    delayBetweenMessages: 30,
    scheduleType: 'now',
    startDate: '',
    startTime: ''
  });

  // Remove unused variables since VariableInput handles suggestions

  // Fetch data
  const { data: leadsData, refetch: refetchLeads, error: leadsError } = useQuery({ 
    queryKey: ['lead-files'],
    queryFn: async () => {
      const response = await fetch('/api/lead-files');
      const data = await response.json();
      return data.success ? data.leadFiles : [];
    }
  });
  const { data: accountsData, refetch: refetchAccounts, error: accountsError } = useQuery({ 
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await fetch('/api/accounts');
      const data = await response.json();
      return data.success ? data.data : [];
    }
  });



  const leadFiles: LeadFile[] = Array.isArray(leadsData) 
    ? leadsData.map((file: any) => ({
      id: file.id,
      name: file.name,
      columnNames: file.columnNames || [],
      totalRows: file.rowCount || 0
    })) 
    : [];
  // Debug logging
  console.log('🔍 Campaign Create - Debug Info:');
  console.log('  - accountsData:', accountsData);
  console.log('  - leadFiles:', leadFiles);
  
  const accounts: InstagramAccount[] = Array.isArray(accountsData) 
    ? accountsData.filter((a: InstagramAccount) => {
        console.log('  - Checking account:', a.username, 'status:', a.status);
        return a.status === 'active';
      })
    : [];
  
  console.log('  - Final filtered accounts:', accounts);



  const selectedLeadFile = leadFiles.find(f => f.id === formData.leadFileId);

  // Set default account selection when accounts are loaded
  React.useEffect(() => {
    if (accounts.length > 0 && formData.selectedAccounts.length === 0) {
      setFormData(prev => ({
        ...prev,
        selectedAccounts: accounts.map(a => a.id)
      }));
    }
  }, [accounts, formData.selectedAccounts.length]);

  // Create campaign mutation
  const createMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify(campaignData),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error('Campaign creation failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      toast({
        title: 'Success',
        description: 'Campaign created successfully',
      });
      setLocation('/campaigns');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create campaign',
        variant: 'destructive',
      });
    },
  });

  const handleProfileUrlInput = (value: string) => {
    setFormData({ ...formData, profileUrlColumn: value });
  };

  const handleMessageColumnInput = (value: string) => {
    setFormData({ ...formData, messageColumn: value });
  };

  const handleMessageTemplateInput = (value: string) => {
    setFormData({ ...formData, messageTemplate: value });
  };

  const handlePreviewVariables = async () => {
    if (!formData.leadFileId || (!formData.messageTemplate && !formData.messageColumn)) {
      toast({
        title: "Preview Error",
        description: "Please select a lead file and add a message template or column first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingPreview(true);
    try {
      // Get sample leads from the selected file
      const response = await fetch(`/api/leads/files/${formData.leadFileId}/leads`);
      const data = await response.json();
      
      if (!data.success || !data.leads || data.leads.length === 0) {
        toast({
          title: "Preview Error",
          description: "No leads found in the selected file.",
          variant: "destructive",
        });
        return;
      }

      // Take first 3 leads for preview
      const sampleLeads = data.leads.slice(0, 3);
      const processedLeads = [];

      for (const lead of sampleLeads) {
        let template = formData.messageTemplate;
        
        // If using message column, get the message from the column
        if (formData.messageColumn && !formData.messageTemplate) {
          template = lead.customFields[formData.messageColumn] || '';
        }

        if (!template) continue;

        // Test the variable processing
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
            profileUrl: lead.customFields[formData.profileUrlColumn] || lead.profileUrl
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

  // Remove the old suggestion logic since VariableInput handles it

  // Remove handleKeyDown since VariableInput handles keyboard navigation

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.leadFileId || !formData.profileUrlColumn || (!formData.messageColumn && !formData.messageTemplate) || formData.selectedAccounts.length === 0) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate({
      name: formData.name,
      leadFileId: formData.leadFileId,
      profileUrlColumn: formData.profileUrlColumn,
      messageColumn: formData.messageColumn,
      messageTemplate: formData.messageTemplate,
      accountIds: formData.selectedAccounts,
      maxMessagesPerDay: formData.maxMessagesPerDay,
      delayBetweenMessages: formData.delayBetweenMessages,
    });
  };

  const steps = [
    { id: 1, name: 'Campaign Name & Accounts', icon: Settings },
    { id: 2, name: 'Select Lead File', icon: Users },
    { id: 3, name: 'Setup Columns & Message', icon: MessageSquare },
    { id: 4, name: 'Schedule & Run', icon: Save }
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <Card className="card-gradient hover-lift">
              <CardHeader>
                <CardTitle>Campaign Name</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
            <div>
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter campaign name"
                  />
              </div>
              </CardContent>
            </Card>

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
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">Select accounts to use:</span>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            if (formData.selectedAccounts.length === accounts.length) {
                              setFormData({ ...formData, selectedAccounts: [] });
                            } else {
                              setFormData({ ...formData, selectedAccounts: accounts.map(a => a.id) });
                            }
                          }}
                        >
                          {formData.selectedAccounts.length === accounts.length ? 'Deselect All' : 'Select All'}
                        </Button>
                  </div>
                      {accounts.map((account) => (
                        <div key={account.id} className="flex items-center space-x-2">
                          <Checkbox
                      checked={formData.selectedAccounts.includes(account.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                          setFormData({
                            ...formData,
                            selectedAccounts: [...formData.selectedAccounts, account.id]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            selectedAccounts: formData.selectedAccounts.filter(id => id !== account.id)
                          });
                        }
                      }}
                          />
                          <div>
                            <label className="text-sm font-medium">@{account.username}</label>
                            <div className="text-xs text-gray-500">
                              Health: {account.healthScore}% • Status: {account.status}
                    </div>
              </div>
            </div>
                      ))}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

            case 2:
        return (
          <Card className="card-gradient hover-lift">
            <CardHeader>
              <CardTitle>Select Lead File</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leadFiles.length === 0 ? (
                  <div className="text-sm text-gray-600">
                    No lead files available. <Button variant="link" onClick={() => setLocation('/leads')}>Upload leads</Button>
                  </div>
                ) : (
                  leadFiles.map((file) => (
                    <div key={file.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.leadFileId === file.id}
                        onCheckedChange={(checked) => {
                          setFormData({ ...formData, leadFileId: checked ? file.id : null });
                        }}
                      />
                <div>
                        <label className="text-sm font-medium">{file.name}</label>
                        <div className="text-xs text-gray-500">{file.totalRows} leads • {file.columnNames.length} columns</div>
                </div>
              </div>
                  ))
                )}
                
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
        );

      case 3:
        return (
          <Card className="card-gradient hover-lift">
            <CardHeader>
              <CardTitle>Setup Columns & Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="profile-url">Profile URL Column</Label>
                  <VariableInput
                    value={formData.profileUrlColumn}
                    onChange={handleProfileUrlInput}
                    placeholder="Type / to select column"
                    suggestions={selectedLeadFile?.columnNames || []}
                  />
                  <div className="text-xs text-gray-500">
                    Select the column containing Instagram profile URLs
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message-column">Message Column (Optional)</Label>
                  <VariableInput
                    value={formData.messageColumn}
                    onChange={handleMessageColumnInput}
                    placeholder="Type / to select message column"
                    suggestions={selectedLeadFile?.columnNames || []}
                  />
                  <div className="text-xs text-gray-500">
                    If you have a column with pre-written messages, select it here
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message-template">Message Template</Label>
                <VariableInput
                  value={formData.messageTemplate}
                  onChange={handleMessageTemplateInput}
                  placeholder="Type / to use variables from your leads"
                  suggestions={selectedLeadFile?.columnNames || []}
                  multiline={true}
                />
                <div className="text-xs text-gray-500">
                  Write your message template using variables from your leads. Variables will be replaced with actual data.
                </div>
              </div>

              {/* Preview Button */}
              <div className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreviewVariables}
                  disabled={isLoadingPreview || !formData.leadFileId || (!formData.messageTemplate && !formData.messageColumn)}
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
                            {formData.messageTemplate || `Column: ${formData.messageColumn}`}
                          </div>
                        </div>
                        <div className="text-sm text-blue-800">
                          <strong>Processed Message:</strong>
                          <div className="mt-1 p-2 bg-white rounded border text-gray-700">
                            {item.processed}
                          </div>
                        </div>
                        {Object.keys(item.variables).length > 0 && (
                          <div className="mt-2 text-xs text-blue-600">
                            <strong>Variables replaced:</strong>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {Object.entries(item.variables).map(([key, value]) => (
                                <span key={key} className="bg-blue-100 px-2 py-1 rounded">
                                  /{key}: {String(value)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Examples:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-700 mb-1">Using message column:</div>
                    <div className="text-gray-600">Select <code className="bg-gray-200 px-1 rounded">/messages</code> in Message Column field</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-700 mb-1">Using custom template:</div>
                    <div className="text-gray-600">Type: <code className="bg-gray-200 px-1 rounded">Hi /Username, I saw your post and I think you are interested in AI automations...</code></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card className="card-gradient hover-lift">
            <CardHeader>
              <CardTitle>Schedule & Run Campaign</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Scheduling Options */}
                <div>
                  <Label className="text-base font-medium">When to Start Campaign</Label>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <Button
                      variant={formData.scheduleType === 'now' ? 'default' : 'outline'}
                      onClick={() => setFormData({ ...formData, scheduleType: 'now' })}
                      className="h-auto p-4 flex flex-col items-center gap-2"
                    >
                      <Play className="h-5 w-5" />
                      <span>Start Now</span>
                    </Button>
                    <Button
                      variant={formData.scheduleType === 'later' ? 'default' : 'outline'}
                      onClick={() => setFormData({ ...formData, scheduleType: 'later' })}
                      className="h-auto p-4 flex flex-col items-center gap-2"
                    >
                      <Clock className="h-5 w-5" />
                      <span>Schedule Later</span>
                    </Button>
                  </div>
                </div>

                {/* Schedule Date/Time */}
                {formData.scheduleType === 'later' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <Separator />

                {/* Campaign Settings */}
                <div>
                  <Label className="text-base font-medium">Campaign Settings</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <Label htmlFor="max-messages">Max Messages Per Day</Label>
                      <Input
                        id="max-messages"
                        type="number"
                        value={formData.maxMessagesPerDay}
                        onChange={(e) => setFormData({ ...formData, maxMessagesPerDay: Number(e.target.value) })}
                        min="1"
                        max="100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="delay">Delay Between Messages (seconds)</Label>
                      <Input
                        id="delay"
                        type="number"
                        value={formData.delayBetweenMessages}
                        onChange={(e) => setFormData({ ...formData, delayBetweenMessages: Number(e.target.value) })}
                        min="10"
                        max="300"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Campaign Summary */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-900">
                    <strong>Campaign Summary:</strong>
                    <div className="mt-2 space-y-1">
                      <div>• Name: {formData.name}</div>
                      <div>• Lead File: {selectedLeadFile?.name}</div>
                      <div>• Profile Column: {formData.profileUrlColumn}</div>
                      <div>• Message Column: {formData.messageColumn || 'None'}</div>
                      <div>• Message Template: {formData.messageTemplate ? formData.messageTemplate.substring(0, 50) + '...' : 'None'}</div>
                      <div>• Accounts: {formData.selectedAccounts.length}</div>
                      <div>• Start: {formData.scheduleType === 'now' ? 'Immediately' : `${formData.startDate} at ${formData.startTime}`}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.name.trim() !== '' && formData.selectedAccounts.length > 0;
      case 2: return formData.leadFileId !== null;
      case 3: return formData.profileUrlColumn && (formData.messageColumn || formData.messageTemplate);
      case 4: return true;
      default: return false;
    }
  };

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
                <h1 className="text-xl font-semibold text-gray-900">Create Campaign</h1>
                <p className="text-sm text-gray-600">Set up a new Instagram outreach campaign</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step.id 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : 'border-gray-300 text-gray-500'
              }`}>
                  <step.icon className="w-5 h-5" />
              </div>
              <div className="ml-3">
                <div className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step.name}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
      </div>

      {/* Step Content */}
          {renderStepContent()}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
            <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
          </Button>

        <div className="flex items-center space-x-3">
          {currentStep < steps.length ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed()}
                className="primary-gradient"
            >
              Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
          ) : (
              <Button
              onClick={handleSubmit}
                disabled={!canProceed() || createMutation.isPending}
                className="primary-gradient"
              >
                {createMutation.isPending ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create & Run Campaign
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCampaign;