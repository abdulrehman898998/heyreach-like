import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandInput } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { authHeaders } from "@/lib/queryClient";

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

export default function CreateCampaign() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [profileUrl, setProfileUrl] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [columns, setColumns] = useState<Column[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [showColumnSelect, setShowColumnSelect] = useState(false);
  const [showProfileUrlColumnSelect, setShowProfileUrlColumnSelect] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [profileUrlCursorPosition, setProfileUrlCursorPosition] = useState(0);
  const [previewData, setPreviewData] = useState<Record<string, string>>({});

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

  useEffect(() => {
    fetchColumns();
    fetchAccounts();
  }, []);

  const fetchColumns = async () => {
    try {
      const response = await fetch("/api/templates/columns", {
        headers: {
          ...authHeaders(),
        },
      });
      const data = await response.json();
      if (data.success) {
        console.log("Fetched columns:", data.columns);
        const columnsList = data.columns.map((col: string) => ({
          value: col,
          label: col
        }));
        setColumns(columnsList);
        const sampleData = generatePreviewData(columnsList);
        setPreviewData(sampleData);
      }
    } catch (error) {
      console.error("Failed to fetch columns:", error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts", {
        headers: {
          ...authHeaders(),
        },
      });
      const data = await response.json();
      if (data.success) {
        setAccounts(data.accounts);
        setSelectedAccounts(data.accounts.map((acc: Account) => acc.id));
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
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
    const position = e.target.selectionStart || 0;
    
    setProfileUrl(value);
    setProfileUrlCursorPosition(position);

    if (value.charAt(position - 1) === '/') {
      setShowProfileUrlColumnSelect(true);
    } else {
      setShowProfileUrlColumnSelect(false);
    }
  };

  const insertColumn = (columnName: string) => {
    console.log("Inserting column:", columnName, "at position:", cursorPosition);
    console.log("Current message:", message);
    
    // Find the last '/' character before the cursor and replace it with the column
    const beforeSlash = message.slice(0, cursorPosition).lastIndexOf('/');
    if (beforeSlash !== -1) {
      const before = message.slice(0, beforeSlash);
      const after = message.slice(cursorPosition);
      const newMessage = before + `{{${columnName}}}` + after;
      console.log("New message:", newMessage);
      setMessage(newMessage);
    } else {
      // Fallback: just insert at cursor position
      const before = message.slice(0, cursorPosition);
      const after = message.slice(cursorPosition);
      const newMessage = before + `{{${columnName}}}` + after;
      console.log("New message (fallback):", newMessage);
      setMessage(newMessage);
    }
    setShowColumnSelect(false);
  };

  const insertProfileUrlColumn = (columnName: string) => {
    console.log("Inserting column into profile URL:", columnName, "at position:", profileUrlCursorPosition);
    console.log("Current profile URL:", profileUrl);
    
    // Find the last '/' character before the cursor and replace it with the column
    const beforeSlash = profileUrl.slice(0, profileUrlCursorPosition).lastIndexOf('/');
    if (beforeSlash !== -1) {
      const before = profileUrl.slice(0, beforeSlash);
      const after = profileUrl.slice(profileUrlCursorPosition);
      const newProfileUrl = before + `{{${columnName}}}` + after;
      console.log("New profile URL:", newProfileUrl);
      setProfileUrl(newProfileUrl);
    } else {
      // Fallback: just insert at cursor position
      const before = profileUrl.slice(0, profileUrlCursorPosition);
      const after = profileUrl.slice(profileUrlCursorPosition);
      const newProfileUrl = before + `{{${columnName}}}` + after;
      console.log("New profile URL (fallback):", newProfileUrl);
      setProfileUrl(newProfileUrl);
    }
    setShowProfileUrlColumnSelect(false);
  };

  const handleAccountToggle = (accountId: number) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleSelectAllAccounts = () => {
    setSelectedAccounts(accounts.map(acc => acc.id));
  };

  const handleDeselectAllAccounts = () => {
    setSelectedAccounts([]);
  };

  const handleSubmit = async () => {
    if (!profileUrl.trim()) {
      toast({
        title: "Profile URL required",
        description: "Please enter a profile URL for your campaign",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a message for your campaign",
        variant: "destructive",
      });
      return;
    }

    if (selectedAccounts.length === 0) {
      toast({
        title: "No accounts selected",
        description: "Please select at least one account for the campaign",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: `Campaign for ${profileUrl}`,
          message,
          accountIds: selectedAccounts,
          startNow: true
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Campaign created!",
          description: "Your campaign has been created. Now configure it to start automation.",
        });
        setLocation(`/campaigns/configure?id=${data.campaign.id}`);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Failed to create campaign",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Campaign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="profileUrl">Profile URL</Label>
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
            
            {/* Profile URL Preview */}
            {profileUrl && profileUrl.includes('{{') && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <Label className="text-sm font-medium text-blue-800">Preview:</Label>
                <div className="text-sm text-blue-700 break-all">
                  {generatePreview(profileUrl, previewData)}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
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
                <div className="absolute bottom-0 left-0 w-full bg-white border rounded-md shadow-lg">
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
            
            {/* Message Preview */}
            {message && message.includes('{{') && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                <Label className="text-sm font-medium text-green-800">Preview:</Label>
                <div className="text-sm text-green-700 whitespace-pre-wrap">
                  {generatePreview(message, previewData)}
                </div>
              </div>
            )}
          </div>

          {/* Sample Data Display */}
          {columns.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Available Variables (Sample Data):</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 border rounded-md">
                {columns.map((column) => (
                  <div key={column.value} className="flex items-center justify-between text-xs">
                    <span className="font-mono text-blue-600">{`{{${column.value}}}`}</span>
                    <span className="text-slate-600 truncate ml-2">
                      {previewData[column.value]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Instagram Accounts</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllAccounts}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAllAccounts}
                >
                  Deselect All
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
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
                      onCheckedChange={() => handleAccountToggle(account.id)}
                    />
                    <Label htmlFor={`account-${account.id}`} className="flex items-center gap-2">
                      <span className="font-medium">@{account.username}</span>
                      <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                        {account.status}
                      </Badge>
                    </Label>
                  </div>
                ))
              )}
            </div>
            
            {selectedAccounts.length > 0 && (
              <p className="text-sm text-slate-600">
                Selected {selectedAccounts.length} of {accounts.length} accounts
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setLocation("/campaigns")}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Campaign"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}