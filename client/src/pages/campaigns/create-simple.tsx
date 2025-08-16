import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, ChevronRight, Users, MessageSquare, Settings } from 'lucide-react';

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
  message: string;
  selectedAccounts: number[];
  maxMessagesPerDay: number;
  delayBetweenMessages: number;
}

const CreateSimpleCampaign: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState<CampaignForm>({
    name: '',
    leadFileId: null,
    profileUrlColumn: '',
    message: '',
    selectedAccounts: [],
    maxMessagesPerDay: 50,
    delayBetweenMessages: 30
  });

  const [showProfileUrlSuggestions, setShowProfileUrlSuggestions] = useState(false);
  const [showMessageSuggestions, setShowMessageSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  
  const profileUrlInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch data
  const { data: leadsData } = useQuery({ queryKey: ['/api/leads/files'] });
  const { data: accountsData } = useQuery({ queryKey: ['/api/accounts'] });

  const leadFiles: LeadFile[] = Array.isArray(leadsData?.files) ? leadsData.files.map((file: any) => ({
    id: file.id,
    name: file.name,
    columnNames: file.columnMapping ? Object.keys(file.columnMapping) : [],
    totalRows: file.totalRows
  })) : [];
  const accounts: InstagramAccount[] = Array.isArray(accountsData) ? accountsData.filter((a: InstagramAccount) => a.status === 'active') : [];

  const selectedLeadFile = leadFiles.find(f => f.id === formData.leadFileId);

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

  const handleProfileUrlInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, profileUrlColumn: value });
    
    if (value.includes('/') && selectedLeadFile) {
      setShowProfileUrlSuggestions(true);
      setSuggestionIndex(0);
    } else {
      setShowProfileUrlSuggestions(false);
    }
  };

  const handleMessageInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, message: value });
    
    if (value.includes('/') && selectedLeadFile) {
      setShowMessageSuggestions(true);
      setSuggestionIndex(0);
    } else {
      setShowMessageSuggestions(false);
    }
  };

  const insertSuggestion = (suggestion: string, isProfileUrl: boolean = false) => {
    if (isProfileUrl) {
      const input = profileUrlInputRef.current;
      if (input) {
        const beforeSlash = formData.profileUrlColumn.substring(0, formData.profileUrlColumn.lastIndexOf('/'));
        const newValue = beforeSlash + '/' + suggestion;
        setFormData({ ...formData, profileUrlColumn: newValue });
        setShowProfileUrlSuggestions(false);
        input.focus();
      }
    } else {
      const textarea = messageInputRef.current;
      if (textarea) {
        const beforeSlash = formData.message.substring(0, formData.message.lastIndexOf('/'));
        const newValue = beforeSlash + '/' + suggestion;
        setFormData({ ...formData, message: newValue });
        setShowMessageSuggestions(false);
        textarea.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, isProfileUrl: boolean = false) => {
    if (!showProfileUrlSuggestions && !showMessageSuggestions) return;

    const suggestions = selectedLeadFile?.columnNames || [];
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestionIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (suggestions[suggestionIndex]) {
        insertSuggestion(suggestions[suggestionIndex], isProfileUrl);
      }
    } else if (e.key === 'Escape') {
      setShowProfileUrlSuggestions(false);
      setShowMessageSuggestions(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.leadFileId || !formData.profileUrlColumn || !formData.message || formData.selectedAccounts.length === 0) {
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
      message: formData.message,
      accountIds: formData.selectedAccounts,
      maxMessagesPerDay: formData.maxMessagesPerDay,
      delayBetweenMessages: formData.delayBetweenMessages,
    });
  };

  const steps = [
    { id: 1, name: 'Campaign Details', icon: Settings },
    { id: 2, name: 'Select Leads & Setup', icon: Users },
    { id: 3, name: 'Review & Create', icon: Save }
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="card-gradient hover-lift">
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
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
        );

             case 2:
         return (
           <div className="space-y-6">
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

             {selectedLeadFile && (
               <Card className="card-gradient hover-lift">
                 <CardHeader>
                   <CardTitle>Campaign Setup</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                       <Label htmlFor="profile-url">Profile URL Column</Label>
                       <div className="relative">
                         <Input
                           id="profile-url"
                           ref={profileUrlInputRef}
                           value={formData.profileUrlColumn}
                           onChange={handleProfileUrlInput}
                           onKeyDown={(e) => handleKeyDown(e, true)}
                           placeholder="Type / to select column"
                         />
                         {showProfileUrlSuggestions && selectedLeadFile && (
                           <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                             {selectedLeadFile.columnNames.map((col, index) => (
                               <div
                                 key={col}
                                 className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                                   index === suggestionIndex ? 'bg-blue-50' : ''
                                 }`}
                                 onClick={() => insertSuggestion(col, true)}
                               >
                                 <span className="text-blue-600">/{col}</span>
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                       <div className="text-xs text-gray-500">
                         Select the column containing Instagram profile URLs
                       </div>
                     </div>

                     <div className="space-y-2">
                       <Label htmlFor="message">Message</Label>
                       <div className="relative">
                         <Textarea
                           id="message"
                           ref={messageInputRef}
                           value={formData.message}
                           onChange={handleMessageInput}
                           onKeyDown={handleKeyDown}
                           placeholder="Type / to use message column or write custom message"
                           rows={4}
                         />
                         {showMessageSuggestions && selectedLeadFile && (
                           <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                             {selectedLeadFile.columnNames.map((col, index) => (
                               <div
                                 key={col}
                                 className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                                   index === suggestionIndex ? 'bg-blue-50' : ''
                                 }`}
                                 onClick={() => insertSuggestion(col)}
                               >
                                 <span className="text-blue-600">/{col}</span>
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                       <div className="text-xs text-gray-500">
                         Use /message_column or write custom message with variables
                       </div>
                     </div>
                   </div>

                   <div className="pt-4 border-t border-gray-200">
                     <h4 className="font-medium text-gray-900 mb-3">Examples:</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                       <div className="p-3 bg-gray-50 rounded-lg">
                         <div className="font-medium text-gray-700 mb-1">If you have a message column:</div>
                         <div className="text-gray-600">Type: <code className="bg-gray-200 px-1 rounded">/messages</code></div>
                       </div>
                       <div className="p-3 bg-gray-50 rounded-lg">
                         <div className="font-medium text-gray-700 mb-1">If you want custom message:</div>
                         <div className="text-gray-600">Type: <code className="bg-gray-200 px-1 rounded">Hi /firstname, I saw your post...</code></div>
                       </div>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             )}

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
                     accounts.map((account) => (
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
                           <div className="text-xs text-gray-500">Health: {account.healthScore}%</div>
                         </div>
                       </div>
                     ))
                   )}
                 </div>
               </CardContent>
             </Card>

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
               </CardContent>
             </Card>
           </div>
         );

                    case 3:
         return (
           <Card className="card-gradient hover-lift">
             <CardHeader>
               <CardTitle>Ready to Create Campaign</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <h4 className="font-medium text-gray-900 mb-2">Campaign Details</h4>
                     <div className="space-y-1 text-sm">
                       <div><span className="text-gray-600">Name:</span> {formData.name}</div>
                       <div><span className="text-gray-600">Lead File:</span> {selectedLeadFile?.name}</div>
                       <div><span className="text-gray-600">Profile Column:</span> {formData.profileUrlColumn}</div>
                     </div>
                   </div>
                   <div>
                     <h4 className="font-medium text-gray-900 mb-2">Message & Accounts</h4>
                     <div className="space-y-1 text-sm">
                       <div><span className="text-gray-600">Message:</span> {formData.message.substring(0, 50)}...</div>
                       <div><span className="text-gray-600">Accounts:</span> {formData.selectedAccounts.length}</div>
                       <div><span className="text-gray-600">Max/Day:</span> {formData.maxMessagesPerDay}</div>
                     </div>
                   </div>
                 </div>
                 
                 <div className="p-4 bg-blue-50 rounded-lg">
                   <div className="text-sm text-blue-900">
                     <strong>Campaign will be created and ready to start!</strong>
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
      case 1: return formData.name.trim() !== '';
      case 2: return formData.leadFileId !== null && formData.profileUrlColumn && formData.message && formData.selectedAccounts.length > 0;
      case 3: return true;
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
                    Create Campaign
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

export default CreateSimpleCampaign;
