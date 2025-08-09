import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandInput } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { FormField } from "@/components/ui/form-field";
import { EmptyState } from "@/components/ui/empty-state";
import { authHeaders } from "@/lib/queryClient";
import { campaignSchema, validateMessageTemplate } from "@/lib/validation";
import { 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  MessageSquare, 
  ExternalLink, 
  Zap, 
  FileText,
  Target,
  Settings,
  Eye,
  Send,
  Plus,
  Database
} from "lucide-react";

interface Column {
  value: string;
  label: string;
}

interface Account {
  id: number;
  username: string;
  platform: string;
  status: string;
}

interface LeadFile {
  id: number;
  name: string;
  totalRows: number;
  uploadedAt: string;
}

export default function CreateCampaignProfessional() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [message, setMessage] = useState("");
  const [selectedLeadFileId, setSelectedLeadFileId] = useState<number | null>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showColumnSelect, setShowColumnSelect] = useState(false);
  const [showProfileUrlColumnSelect, setShowProfileUrlColumnSelect] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [profileUrlCursorPosition, setProfileUrlCursorPosition] = useState(0);
  
  // Data state
  const [columns, setColumns] = useState<Column[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [leadFiles, setLeadFiles] = useState<LeadFile[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, string>>({});
  
  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [messageValidation, setMessageValidation] = useState<{ isValid: boolean; errors: string[] }>({ 
    isValid: true, 
    errors: [] 
  });

  // Validate form in real-time
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!campaignName.trim()) {
      newErrors.campaignName = "Campaign name is required";
    } else if (campaignName.length > 100) {
      newErrors.campaignName = "Campaign name must be less than 100 characters";
    }
    
    if (!profileUrl.trim()) {
      newErrors.profileUrl = "Profile URL template is required";
    }
    
    if (!message.trim()) {
      newErrors.message = "Message template is required";
    } else if (message.length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    } else if (message.length > 2000) {
      newErrors.message = "Message must be less than 2000 characters";
    }
    
    if (selectedAccounts.length === 0) {
      newErrors.accounts = "At least one Instagram account must be selected";
    }
    
    if (!selectedLeadFileId) {
      newErrors.leadFile = "Lead file must be selected";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Generate sample data for preview
  const generatePreviewData = (cols: Column[]) => {
    const sampleData: Record<string, string> = {};
    cols.forEach((col: Column) => {
      switch (col.value.toLowerCase()) {
        case 'username':
          sampleData[col.value] = 'albert_cancook';
          break;
        case 'profileurl':
        case 'profiles':
          sampleData[col.value] = 'https://instagram.com/albert_cancook/';
          break;
        case 'messages':
        case 'message':
          sampleData[col.value] = 'Hey Albert! Your content is amazing!';
          break;
        case 'description':
          sampleData[col.value] = 'Food content creator specializing in quick recipes';
          break;
        case 'profilepic':
          sampleData[col.value] = 'https://example.com/albert.jpg';
          break;
        default:
          sampleData[col.value] = `Sample ${col.label}`;
      }
    });
    return sampleData;
  };

  // Generate real-time preview
  const generatePreview = (template: string, data: Record<string, string>): string => {
    let result = template;
    
    // Handle {{variable}} syntax
    const variableRegex = /\{\{([^}]+)\}\}/g;
    result = result.replace(variableRegex, (match, variable) => {
      const key = variable.trim();
      return data[key] || match;
    });
    
    return result;
  };

  // Insert column variable
  const insertColumn = (column: string, isProfileUrl: boolean = false) => {
    const setterFunction = isProfileUrl ? setProfileUrl : setMessage;
    const currentValue = isProfileUrl ? profileUrl : message;
    const cursorPos = isProfileUrl ? profileUrlCursorPosition : cursorPosition;
    
    const before = currentValue.substring(0, cursorPos);
    const after = currentValue.substring(cursorPos);
    const newValue = before + `{{${column}}}` + after;
    
    setterFunction(newValue);
    setShowColumnSelect(false);
    setShowProfileUrlColumnSelect(false);
  };

  // Handle keyboard events for slash command
  const handleKeyDown = (e: React.KeyboardEvent, isProfileUrl: boolean = false) => {
    if (e.key === '/') {
      e.preventDefault();
      if (isProfileUrl) {
        setShowProfileUrlColumnSelect(true);
        setProfileUrlCursorPosition((e.target as HTMLInputElement).selectionStart || 0);
      } else {
        setShowColumnSelect(true);
        setCursorPosition((e.target as HTMLTextAreaElement).selectionStart || 0);
      }
    }
  };

  // Load data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch columns, accounts, and lead files in parallel
        const [columnsResponse, accountsResponse, leadFilesResponse] = await Promise.all([
          fetch('/api/templates/columns', { headers: authHeaders() }),
          fetch('/api/accounts', { headers: authHeaders() }),
          fetch('/api/leads/files', { headers: authHeaders() })
        ]);

        // Process columns
        const columnsData = await columnsResponse.json();
        if (columnsData.success) {
          const cols = columnsData.columns.map((col: string) => ({ value: col, label: col }));
          setColumns(cols);
          setPreviewData(generatePreviewData(cols));
        }

        // Process accounts
        const accountsData = await accountsResponse.json();
        if (accountsData.success) {
          setAccounts(accountsData.accounts);
        }

        // Process lead files
        const leadFilesData = await leadFilesResponse.json();
        if (leadFilesData.success) {
          setLeadFiles(leadFilesData.files);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load form data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Validate message template in real-time
  useEffect(() => {
    if (message) {
      const validation = validateMessageTemplate(message);
      setMessageValidation(validation);
    } else {
      setMessageValidation({ isValid: true, errors: [] });
    }
  }, [message]);

  // Enhanced create campaign function with validation
  const handleCreateCampaign = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the form errors before submitting",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          name: campaignName,
          profileUrl,
          message,
          selectedAccounts,
          leadFileId: selectedLeadFileId,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({
          title: "Campaign Created",
          description: "Your campaign has been created successfully",
        });
        setLocation('/campaigns');
      } else {
        throw new Error(data.error || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create campaign",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8">
          <div className="flex flex-col items-center space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-muted-foreground">Loading campaign builder...</p>
          </div>
        </Card>
      </div>
    );
  }

  const previewProfileUrl = generatePreview(profileUrl, previewData);
  const previewMessage = generatePreview(message, previewData);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Zap className="h-8 w-8 text-blue-600" />
          Create New Campaign
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Design your outreach campaign with personalized messages and automated delivery to your target audience.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Form */}
        <div className="space-y-6">
          {/* Campaign Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Campaign Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField 
                label="Campaign Name" 
                required 
                error={errors.campaignName}
                description="Choose a descriptive name for this campaign"
              >
                <Input
                  placeholder="e.g., Influencer Outreach Q1 2024"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className={errors.campaignName ? "border-red-500" : ""}
                />
              </FormField>

              <FormField 
                label="Lead File" 
                required 
                error={errors.leadFile}
                description="Select the CSV file containing your leads"
              >
                <Select value={selectedLeadFileId?.toString() || ""} onValueChange={(value) => setSelectedLeadFileId(Number(value))}>
                  <SelectTrigger className={errors.leadFile ? "border-red-500" : ""}>
                    <SelectValue placeholder="Choose lead file..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leadFiles.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        No lead files found. 
                        <Button 
                          variant="link" 
                          className="h-auto p-0 ml-1"
                          onClick={() => setLocation('/leads')}
                        >
                          Upload a CSV file
                        </Button>
                      </div>
                    ) : (
                      leadFiles.map((file) => (
                        <SelectItem key={file.id} value={file.id.toString()}>
                          <div className="flex flex-col">
                            <span>{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {file.totalRows} leads
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </FormField>
            </CardContent>
          </Card>

          {/* Message Template */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Message Template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField 
                label="Profile URL Template" 
                required 
                error={errors.profileUrl}
                description="Use / to insert variables like {{Profiles}}"
              >
                <div className="relative">
                  <Input
                    placeholder="e.g., {{Profiles}} or https://instagram.com/{{username}}"
                    value={profileUrl}
                    onChange={(e) => setProfileUrl(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, true)}
                    className={errors.profileUrl ? "border-red-500" : ""}
                  />
                  {showProfileUrlColumnSelect && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1">
                      <Card className="p-2">
                        <Command>
                          <CommandInput placeholder="Search columns..." />
                          <CommandEmpty>No columns found.</CommandEmpty>
                          <CommandGroup>
                            {columns.map((column) => (
                              <CommandItem
                                key={column.value}
                                onSelect={() => insertColumn(column.value, true)}
                                className="cursor-pointer"
                              >
                                {column.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </Card>
                    </div>
                  )}
                </div>
              </FormField>

              <FormField 
                label="Message Template" 
                required 
                error={errors.message || (!messageValidation.isValid ? messageValidation.errors[0] : "")}
                description="Use / to insert variables. Message will be personalized for each lead."
              >
                <div className="relative">
                  <Textarea
                    placeholder="Hey {{username}}! I loved your recent content about {{topic}}..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, false)}
                    className={`min-h-[120px] ${errors.message || !messageValidation.isValid ? "border-red-500" : ""}`}
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                    {message.length}/2000
                  </div>
                  {showColumnSelect && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1">
                      <Card className="p-2">
                        <Command>
                          <CommandInput placeholder="Search columns..." />
                          <CommandEmpty>No columns found.</CommandEmpty>
                          <CommandGroup>
                            {columns.map((column) => (
                              <CommandItem
                                key={column.value}
                                onSelect={() => insertColumn(column.value, false)}
                                className="cursor-pointer"
                              >
                                {column.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </Card>
                    </div>
                  )}
                </div>
              </FormField>
            </CardContent>
          </Card>

          {/* Account Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Instagram Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField 
                label="Select Accounts" 
                required 
                error={errors.accounts}
                description="Choose which Instagram accounts will send messages"
              >
                {accounts.length === 0 ? (
                  <EmptyState
                    icon={<Users className="h-12 w-12" />}
                    title="No accounts found"
                    description="You need to connect Instagram accounts to send messages"
                    action={
                      <Button onClick={() => setLocation('/accounts')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Account
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {accounts.map((account) => (
                      <div key={account.id} className="flex items-center space-x-3 p-3 border rounded-lg">
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
                        <div className="flex-1">
                          <div className="font-medium">@{account.username}</div>
                          <div className="text-sm text-muted-foreground">{account.platform}</div>
                        </div>
                        <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                          {account.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </FormField>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview */}
        <div className="space-y-6">
          {/* Live Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Profile URL Preview</Label>
                <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
                  {previewProfileUrl || "Enter profile URL template above..."}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Message Preview</Label>
                <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap min-h-[120px]">
                  {previewMessage || "Enter message template above..."}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Preview shows how your template will look with sample data from your CSV
              </div>
            </CardContent>
          </Card>

          {/* Available Variables */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Available Variables
              </CardTitle>
            </CardHeader>
            <CardContent>
              {columns.length === 0 ? (
                <EmptyState
                  icon={<FileText className="h-8 w-8" />}
                  title="No variables available"
                  description="Upload a CSV file with leads to see available variables"
                  action={
                    <Button variant="outline" onClick={() => setLocation('/leads')}>
                      Upload CSV
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Click any variable to copy, or type / in the message field to insert:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {columns.map((column) => (
                      <Badge 
                        key={column.value} 
                        variant="outline" 
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => {
                          navigator.clipboard.writeText(`{{${column.value}}}`);
                          toast({
                            title: "Copied",
                            description: `{{${column.value}}} copied to clipboard`,
                          });
                        }}
                      >
                        {column.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Campaign Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Campaign Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Accounts</div>
                  <div className="text-muted-foreground">{selectedAccounts.length} selected</div>
                </div>
                <div>
                  <div className="font-medium">Leads</div>
                  <div className="text-muted-foreground">
                    {selectedLeadFileId ? leadFiles.find(f => f.id === selectedLeadFileId)?.totalRows || 0 : 0} targets
                  </div>
                </div>
                <div>
                  <div className="font-medium">Message Length</div>
                  <div className="text-muted-foreground">{message.length} characters</div>
                </div>
                <div>
                  <div className="font-medium">Variables</div>
                  <div className="text-muted-foreground">{(message.match(/\{\{([^}]+)\}\}/g) || []).length} used</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <Card>
        <CardFooter className="flex justify-between p-6">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/campaigns')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          
          <Button 
            onClick={handleCreateCampaign}
            disabled={isSubmitting || !validateForm()}
            className="min-w-[140px]"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Create Campaign
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}