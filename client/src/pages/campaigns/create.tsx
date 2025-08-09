import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Zap, Play } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function CreateCampaign() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState("");
  const [profileUrlTemplate, setProfileUrlTemplate] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [showColumnSuggestions, setShowColumnSuggestions] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);

  // Fetch available columns
  const { data: columnsData } = useQuery({ 
    queryKey: ["/api/templates/columns"],
    retry: false
  });
  
  const availableColumns = columnsData?.columns || [];

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/campaigns', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      toast({
        title: "Campaign created successfully",
        description: "Your campaign is ready to run",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      setLocation('/campaigns');
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create campaign",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  const handleSlashCommand = (field: string, value: string, selectionStart: number) => {
    const slashIndex = value.lastIndexOf('/', selectionStart);
    
    if (slashIndex !== -1 && selectionStart > slashIndex) {
      const searchTerm = value.substring(slashIndex + 1, selectionStart).toLowerCase();
      const filteredColumns = availableColumns.filter(col => 
        col.toLowerCase().includes(searchTerm)
      );
      
      if (filteredColumns.length > 0) {
        setShowColumnSuggestions(field);
        setCursorPosition(slashIndex);
      } else {
        setShowColumnSuggestions("");
      }
    } else {
      setShowColumnSuggestions("");
    }
  };

  const insertColumn = (field: string, column: string) => {
    const currentValue = field === 'profileUrl' ? profileUrlTemplate : messageTemplate;
    const beforeSlash = currentValue.substring(0, cursorPosition);
    const afterCursor = currentValue.substring(cursorPosition + 1);
    const newValue = beforeSlash + `{{${column}}}` + afterCursor;
    
    if (field === 'profileUrl') {
      setProfileUrlTemplate(newValue);
    } else {
      setMessageTemplate(newValue);
    }
    
    setShowColumnSuggestions("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !profileUrlTemplate || !messageTemplate) {
      toast({
        title: "Please fill all fields",
        description: "Campaign name, profile URL template, and message template are required",
        variant: "destructive",
      });
      return;
    }

    createCampaignMutation.mutate({
      name,
      profileUrlTemplate,
      messageTemplate,
      status: 'draft'
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation('/campaigns')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Campaigns
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Campaign</h1>
          <p className="text-muted-foreground">Set up your automated outreach campaign</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campaign Name */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Instagram Outreach Q1 2024"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile URL Template */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Profile URL Template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="profileUrl">Profile URL Template</Label>
                <div className="relative">
                  <Input
                    id="profileUrl"
                    value={profileUrlTemplate}
                    onChange={(e) => {
                      setProfileUrlTemplate(e.target.value);
                      handleSlashCommand('profileUrl', e.target.value, e.target.selectionStart || 0);
                    }}
                    placeholder="Type / to insert column variables, e.g., {{Profiles}}"
                  />
                  
                  {showColumnSuggestions === 'profileUrl' && availableColumns.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
                      {availableColumns.slice(0, 5).map((column) => (
                        <button
                          key={column}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 first:rounded-t-md last:rounded-b-md"
                          onClick={() => insertColumn('profileUrl', column)}
                        >
                          {column}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  This will be the Instagram profile URL for each lead. Use variables from your CSV columns.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message Template */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Message Template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="message">Message Template</Label>
                <div className="relative">
                  <Textarea
                    id="message"
                    value={messageTemplate}
                    onChange={(e) => {
                      setMessageTemplate(e.target.value);
                      handleSlashCommand('message', e.target.value, e.target.selectionStart || 0);
                    }}
                    placeholder="Type / to insert column variables, e.g., Hey {{name}}! {{message}}"
                    className="min-h-[120px]"
                  />
                  
                  {showColumnSuggestions === 'message' && availableColumns.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
                      {availableColumns.slice(0, 5).map((column) => (
                        <button
                          key={column}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 first:rounded-t-md last:rounded-b-md"
                          onClick={() => insertColumn('message', column)}
                        >
                          {column}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  This will be the personalized message sent to each profile. Use variables from your CSV columns.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Columns */}
        {availableColumns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Available Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {availableColumns.map((column) => (
                  <span 
                    key={column}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {`{{${column}}}`}
                  </span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                These variables are available from your uploaded CSV files. Type "/" in the fields above to insert them.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Preview */}
        {(profileUrlTemplate || messageTemplate) && (
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profileUrlTemplate && (
                  <div>
                    <Label className="text-sm font-medium">Profile URL:</Label>
                    <p className="text-sm bg-gray-50 p-2 rounded border">{profileUrlTemplate}</p>
                  </div>
                )}
                {messageTemplate && (
                  <div>
                    <Label className="text-sm font-medium">Message:</Label>
                    <p className="text-sm bg-gray-50 p-2 rounded border whitespace-pre-wrap">{messageTemplate}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={createCampaignMutation.isPending || !name || !profileUrlTemplate || !messageTemplate}
            className="flex-1"
          >
            {createCampaignMutation.isPending ? "Creating..." : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Create Campaign
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}