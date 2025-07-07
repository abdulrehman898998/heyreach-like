import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGoogleSheetSchema } from "@shared/schema";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Sheet, ExternalLink, Loader2 } from "lucide-react";

type GoogleSheetForm = z.infer<typeof insertGoogleSheetSchema>;

export default function GoogleSheets() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [tokens, setTokens] = useState<{ access_token: string; refresh_token: string } | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<any>(null);
  const { toast } = useToast();

  // Check for tokens in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    
    if (accessToken && refreshToken) {
      setTokens({ access_token: accessToken, refresh_token: refreshToken });
      // Clean up URL
      window.history.replaceState({}, document.title, '/google-sheets');
    }
  }, []);

  const { data: savedSheets = [], isLoading: loadingSavedSheets } = useQuery({
    queryKey: ["/api/google-sheets"],
  });

  const { data: userSheets = [], isLoading: loadingUserSheets } = useQuery({
    queryKey: ["/api/google/sheets", tokens?.access_token],
    enabled: !!tokens,
    queryFn: async () => {
      const response = await fetch(`/api/google/sheets?access_token=${tokens!.access_token}&refresh_token=${tokens!.refresh_token}`);
      return response.json();
    }
  });

  const { data: sheetMetadata = [], isLoading: loadingMetadata } = useQuery({
    queryKey: ["/api/google/sheets", selectedSheet?.id, "metadata"],
    enabled: !!selectedSheet && !!tokens,
    queryFn: async () => {
      const response = await fetch(`/api/google/sheets/${selectedSheet.id}/metadata?access_token=${tokens!.access_token}&refresh_token=${tokens!.refresh_token}`);
      return response.json();
    }
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/auth/google");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect to Google');
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Google auth URL:', data.authUrl);
      window.location.href = data.authUrl;
    },
    onError: (error: any) => {
      console.error('Google connection error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to connect to Google",
        variant: "destructive",
      });
    },
  });

  const addSheetMutation = useMutation({
    mutationFn: async (data: { name: string; sheetId: string; sheetName: string; range: string }) => {
      const sheetData = {
        name: data.name,
        sheetUrl: `https://docs.google.com/spreadsheets/d/${data.sheetId}`,
        range: `${data.sheetName}!${data.range}`,
        accessToken: tokens!.access_token,
        refreshToken: tokens!.refresh_token,
      };

      const response = await apiRequest("/api/google-sheets", {
        method: "POST",
        body: JSON.stringify(sheetData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/google-sheets"] });
      setSelectedSheet(null);
      setTokens(null);
      toast({
        title: "Success",
        description: "Google Sheet connected successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to connect Google Sheet",
        variant: "destructive",
      });
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      sheetName: "",
      range: "A:Z",
    },
  });

  const onSubmit = (data: any) => {
    if (!selectedSheet) return;
    
    addSheetMutation.mutate({
      name: data.name,
      sheetId: selectedSheet.id,
      sheetName: data.sheetName,
      range: data.range,
    });
  };

  if (loadingSavedSheets) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Google Sheets</h1>
          <p className="text-gray-600">Connect your Google Sheets to use as campaign data sources</p>
        </div>
        
        {!tokens ? (
          <Button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending}>
            {connectMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Connect Google Account
              </>
            )}
          </Button>
        ) : (
          <div className="text-sm text-green-600 font-medium">✓ Google Account Connected</div>
        )}
      </div>

      {/* Show user's Google Sheets if connected */}
      {tokens && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Select a Sheet to Import</h2>
          
          {loadingUserSheets ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userSheets.map((sheet: any) => (
                <Card 
                  key={sheet.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedSheet?.id === sheet.id ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedSheet(sheet)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Sheet className="w-5 h-5 text-green-600 mt-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {sheet.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Click to select
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Sheet configuration form */}
          {selectedSheet && (
            <Card>
              <CardHeader>
                <CardTitle>Configure Sheet Import</CardTitle>
                <p className="text-sm text-gray-600">
                  Selected: {selectedSheet.name}
                </p>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Configuration Name</FormLabel>
                          <FormControl>
                            <Input placeholder="My Target List" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="sheetName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sheet Tab</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select sheet tab" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {loadingMetadata ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : (
                                  sheetMetadata.map((tab: any) => (
                                    <SelectItem key={tab.title} value={tab.title}>
                                      {tab.title}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="range"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Range</FormLabel>
                            <FormControl>
                              <Input placeholder="A:Z" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setSelectedSheet(null)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={addSheetMutation.isPending}>
                        {addSheetMutation.isPending ? "Adding..." : "Add Sheet"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Saved Google Sheets */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Connected Sheets</h2>
        
        {savedSheets.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Sheet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sheets connected</h3>
              <p className="text-gray-500 mb-4">
                Connect your Google Sheets to use them as data sources for your campaigns.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedSheets.map((sheet: any) => (
              <Card key={sheet.id}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Sheet className="w-5 h-5 text-green-600 mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {sheet.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Range: {sheet.range}
                      </p>
                      <p className="text-xs text-gray-400">
                        Added {new Date(sheet.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}