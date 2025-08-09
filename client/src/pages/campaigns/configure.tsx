import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { authHeaders } from '@/lib/auth-headers';
import { Play, Clock, Users, MessageCircle, ChevronRight, Settings } from 'lucide-react';

interface LeadFile {
  id: number;
  filename: string;
  totalRows: number;
  uploadedAt: string;
}

interface Column {
  value: string;
  label: string;
}

interface Account {
  id: number;
  username: string;
  status: string;
  healthScore: number;
}

interface Campaign {
  id: number;
  name: string;
  status: string;
}

export default function ConfigureCampaign() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leadFiles, setLeadFiles] = useState<LeadFile[]>([]);
  const [selectedLeadFileId, setSelectedLeadFileId] = useState<string>('');
  const [columns, setColumns] = useState<Column[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  
  // Message configuration
  const [profileUrl, setProfileUrl] = useState('');
  const [message, setMessage] = useState('');
  const [showColumnSelect, setShowColumnSelect] = useState(false);
  const [showProfileUrlColumnSelect, setShowProfileUrlColumnSelect] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [profileUrlCursorPosition, setProfileUrlCursorPosition] = useState(0);
  
  // Scheduling configuration
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>('now');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [messagesPerDay, setMessagesPerDay] = useState(50);
  const [delayBetweenMessages, setDelayBetweenMessages] = useState(30);
  
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, string>>({});

  useEffect(() => {
    // Get campaign ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
      setCampaignId(parseInt(id));
      fetchCampaign(parseInt(id));
    } else {
      setLocation('/campaigns');
    }
    
    fetchLeadFiles();
    fetchColumns();
    fetchAccounts();
  }, []);

  const fetchCampaign = async (id: number) => {
    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        headers: { ...authHeaders() },
      });
      const data = await response.json();
      if (data.success) {
        setCampaign(data.campaign);
      }
    } catch (error) {
      console.error('Failed to fetch campaign:', error);
    }
  };

  const fetchLeadFiles = async () => {
    try {
      const response = await fetch('/api/leads/files', {
        headers: { ...authHeaders() },
      });
      const data = await response.json();
      if (data.success) {
        setLeadFiles(data.files);
      }
    } catch (error) {
      console.error('Failed to fetch lead files:', error);
    }
  };

  const fetchColumns = async () => {
    try {
      const response = await fetch('/api/templates/columns', {
        headers: { ...authHeaders() },
      });
      const data = await response.json();
      if (data.success) {
        const columnsList = data.columns.map((col: string) => ({
          value: col,
          label: col
        }));
        setColumns(columnsList);
        
        // Create sample preview data
        const sampleData: Record<string, string> = {};
        columnsList.forEach((col: Column) => {
          sampleData[col.value] = `Sample ${col.label}`;
        });
        setPreviewData(sampleData);
      }
    } catch (error) {
      console.error('Failed to fetch columns:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts', {
        headers: { ...authHeaders() },
      });
      const data = await response.json();
      if (data.success) {
        setAccounts(data.accounts);
        setSelectedAccounts(data.accounts.map((acc: Account) => acc.id));
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart;
    
    setMessage(value);
    setCursorPosition(position);

    if (value.charAt(position - 1) === '/') {
      setShowColumnSelect(true);
    } else {
      setShowColumnSelect(false);
    }
  };

  const handleProfileUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart;
    
    setProfileUrl(value);
    setProfileUrlCursorPosition(position);

    if (value.charAt(position - 1) === '/') {
      setShowProfileUrlColumnSelect(true);
    } else {
      setShowProfileUrlColumnSelect(false);
    }
  };

  const insertColumn = (columnName: string) => {
    const beforeCursor = message.substring(0, cursorPosition - 1);
    const afterCursor = message.substring(cursorPosition);
    const newValue = beforeCursor + `{{${columnName}}}` + afterCursor;
    
    setMessage(newValue);
    setShowColumnSelect(false);
  };

  const insertProfileUrlColumn = (columnName: string) => {
    const beforeCursor = profileUrl.substring(0, profileUrlCursorPosition - 1);
    const afterCursor = profileUrl.substring(profileUrlCursorPosition);
    const newValue = beforeCursor + `{{${columnName}}}` + afterCursor;
    
    setProfileUrl(newValue);
    setShowProfileUrlColumnSelect(false);
  };

  const getMessagePreview = () => {
    let preview = message;
    const variables = message.match(/\{\{([^}]+)\}\}/g) || [];
    
    variables.forEach((variable) => {
      const columnName = variable.slice(2, -2);
      preview = preview.replace(variable, previewData[columnName] || `[${columnName}]`);
    });
    
    return preview;
  };

  const getProfileUrlPreview = () => {
    let preview = profileUrl;
    const variables = profileUrl.match(/\{\{([^}]+)\}\}/g) || [];
    
    variables.forEach((variable) => {
      const columnName = variable.slice(2, -2);
      preview = preview.replace(variable, previewData[columnName] || `[${columnName}]`);
    });
    
    return preview;
  };

  const handleConfigureAndStart = async () => {
    if (!campaignId || !selectedLeadFileId || !profileUrl || !message) {
      toast({
        title: 'Missing information',
        description: 'Please select a lead file and configure your message',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // First configure the campaign
      const configResponse = await fetch(`/api/campaigns/${campaignId}/configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          profileUrl,
          message,
          leadFileId: selectedLeadFileId,
        }),
      });

      const configData = await configResponse.json();
      if (!configData.success) {
        throw new Error(configData.error || 'Failed to configure campaign');
      }

      // If immediate start is selected, start the campaign
      if (scheduleType === 'now') {
        const startResponse = await fetch(`/api/campaigns/${campaignId}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
          },
        });

        const startData = await startResponse.json();
        if (!startData.success) {
          throw new Error(startData.error || 'Failed to start campaign');
        }

        toast({
          title: 'Campaign Started!',
          description: 'Your outreach campaign is now running',
        });
      } else {
        toast({
          title: 'Campaign Configured',
          description: 'Your campaign has been set up and scheduled',
        });
      }

      setLocation('/campaigns');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to configure campaign',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!campaign) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading campaign...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Configure Campaign</h1>
          <p className="text-slate-600 mt-1">Set up your outreach automation for "{campaign.name}"</p>
        </div>
        <Badge variant={campaign.status === 'draft' ? 'secondary' : 'default'}>
          {campaign.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lead File Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Lead File
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedLeadFileId} onValueChange={setSelectedLeadFileId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a lead file to use for this campaign" />
                </SelectTrigger>
                <SelectContent>
                  {leadFiles.map((file) => (
                    <SelectItem key={file.id} value={file.id.toString()}>
                      {file.filename} ({file.totalRows} leads)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedLeadFileId && (
                <div className="p-3 bg-slate-50 rounded-md">
                  <p className="text-sm text-slate-600">
                    Selected: {leadFiles.find(f => f.id.toString() === selectedLeadFileId)?.totalRows} leads will be contacted
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Configure Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Profile URL Field */}
              <div className="space-y-2">
                <Label htmlFor="profileUrl">Profile URL Template</Label>
                <div className="relative">
                  <Input
                    id="profileUrl"
                    placeholder="Enter Instagram profile URL or use / to insert column variables"
                    value={profileUrl}
                    onChange={handleProfileUrlChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowProfileUrlColumnSelect(false);
                      }
                    }}
                  />
                  
                  {showProfileUrlColumnSelect && (
                    <div className="absolute top-full left-0 w-full bg-white border rounded-md shadow-lg z-10">
                      <Command>
                        <CommandInput placeholder="Search columns..." />
                        <CommandEmpty>No columns found.</CommandEmpty>
                        <CommandGroup>
                          {columns.map((column) => (
                            <CommandItem
                              key={column.value}
                              onSelect={() => insertProfileUrlColumn(column.value)}
                            >
                              {column.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </div>
                  )}
                </div>
              </div>

              {/* Message Field */}
              <div className="space-y-2">
                <Label htmlFor="message">Message Template</Label>
                <div className="relative">
                  <textarea
                    id="message"
                    className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Type your message. Use / to insert column variables"
                    value={message}
                    onChange={handleMessageChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowColumnSelect(false);
                      }
                    }}
                  />
                  
                  {showColumnSelect && (
                    <div className="absolute bottom-0 left-0 w-full bg-white border rounded-md shadow-lg z-10">
                      <Command>
                        <CommandInput placeholder="Search columns..." />
                        <CommandEmpty>No columns found.</CommandEmpty>
                        <CommandGroup>
                          {columns.map((column) => (
                            <CommandItem
                              key={column.value}
                              onSelect={() => insertColumn(column.value)}
                            >
                              {column.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              {profileUrl && (
                <div className="space-y-2">
                  <Label>Profile URL Preview</Label>
                  <div className="rounded-md border p-4 bg-slate-50">
                    <p className="text-sm break-all">{getProfileUrlPreview()}</p>
                  </div>
                </div>
              )}

              {message && (
                <div className="space-y-2">
                  <Label>Message Preview</Label>
                  <div className="rounded-md border p-4 bg-slate-50">
                    <p className="text-sm whitespace-pre-wrap">{getMessagePreview()}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scheduling Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Schedule Campaign
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={scheduleType === 'now' ? 'default' : 'outline'}
                  onClick={() => setScheduleType('now')}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <Play className="h-5 w-5" />
                  <span>Start Now</span>
                </Button>
                <Button
                  variant={scheduleType === 'later' ? 'default' : 'outline'}
                  onClick={() => setScheduleType('later')}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <Clock className="h-5 w-5" />
                  <span>Schedule Later</span>
                </Button>
              </div>

              {scheduleType === 'later' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="messagesPerDay">Messages per Day</Label>
                  <Input
                    id="messagesPerDay"
                    type="number"
                    min="1"
                    max="150"
                    value={messagesPerDay}
                    onChange={(e) => setMessagesPerDay(parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delayBetweenMessages">Delay Between Messages (seconds)</Label>
                  <Input
                    id="delayBetweenMessages"
                    type="number"
                    min="5"
                    max="300"
                    value={delayBetweenMessages}
                    onChange={(e) => setDelayBetweenMessages(parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Instagram Accounts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {accounts.length === 0 ? (
                  <p className="text-sm text-slate-600 text-center py-4">
                    No Instagram accounts found. Please add accounts first.
                  </p>
                ) : (
                  accounts.map((account) => (
                    <div key={account.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`account-${account.id}`}
                        checked={selectedAccounts.includes(account.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAccounts([...selectedAccounts, account.id]);
                          } else {
                            setSelectedAccounts(selectedAccounts.filter(id => id !== account.id));
                          }
                        }}
                      />
                      <Label htmlFor={`account-${account.id}`} className="flex items-center gap-2 flex-1">
                        <div className="flex flex-col">
                          <span className="font-medium">@{account.username}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={account.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {account.status}
                            </Badge>
                            <span className="text-xs text-slate-500">Health: {account.healthScore}%</span>
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))
                )}
              </div>
              
              {selectedAccounts.length > 0 && (
                <p className="text-sm text-slate-600 pt-2 border-t">
                  Selected {selectedAccounts.length} of {accounts.length} accounts
                </p>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Lead File:</span>
                <span className="text-sm font-medium">
                  {selectedLeadFileId ? leadFiles.find(f => f.id.toString() === selectedLeadFileId)?.filename : 'Not selected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Total Leads:</span>
                <span className="text-sm font-medium">
                  {selectedLeadFileId ? leadFiles.find(f => f.id.toString() === selectedLeadFileId)?.totalRows : 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Accounts:</span>
                <span className="text-sm font-medium">{selectedAccounts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Schedule:</span>
                <span className="text-sm font-medium">{scheduleType === 'now' ? 'Start Now' : 'Scheduled'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Daily Limit:</span>
                <span className="text-sm font-medium">{messagesPerDay} messages</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => setLocation('/campaigns')}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleConfigureAndStart} 
          disabled={isLoading || !selectedLeadFileId || !profileUrl || !message}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
          ) : scheduleType === 'now' ? (
            <Play className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
          {isLoading ? 'Configuring...' : scheduleType === 'now' ? 'Configure & Start Campaign' : 'Configure & Schedule Campaign'}
        </Button>
      </div>
    </div>
  );
}