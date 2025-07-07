import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ExternalLink, Sheet } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const addSheetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sheetUrl: z.string().url("Please enter a valid Google Sheets URL"),
  range: z.string().optional(),
});

type AddSheetForm = z.infer<typeof addSheetSchema>;

export default function Sheets() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddSheetModalOpen, setIsAddSheetModalOpen] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch Google Sheets
  const { data: sheets, error: sheetsError, isLoading: isLoadingSheets } = useQuery({
    queryKey: ["/api/google-sheets"],
    enabled: isAuthenticated,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (sheetsError && isUnauthorizedError(sheetsError as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [sheetsError, toast]);

  // Add sheet form
  const form = useForm<AddSheetForm>({
    resolver: zodResolver(addSheetSchema),
    defaultValues: {
      name: "",
      sheetUrl: "",
      range: "A:Z",
    },
  });

  // Add sheet mutation
  const addSheetMutation = useMutation({
    mutationFn: async (data: AddSheetForm) => {
      await apiRequest("POST", "/api/google-sheets", data);
    },
    onSuccess: () => {
      toast({
        title: "Sheet Added",
        description: "Google Sheet has been added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/google-sheets"] });
      setIsAddSheetModalOpen(false);
      form.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add Google Sheet",
        variant: "destructive",
      });
    },
  });

  // Delete sheet mutation
  const deleteSheetMutation = useMutation({
    mutationFn: async (sheetId: number) => {
      await apiRequest("DELETE", `/api/google-sheets/${sheetId}`);
    },
    onSuccess: () => {
      toast({
        title: "Sheet Deleted",
        description: "Google Sheet has been deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/google-sheets"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete Google Sheet",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddSheetForm) => {
    addSheetMutation.mutate(data);
  };

  const extractSheetId = (url: string) => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const getSheetPreviewUrl = (url: string) => {
    const sheetId = extractSheetId(url);
    return sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/preview` : url;
  };

  if (isLoading || isLoadingSheets) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading sheets...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex flex-col min-w-0 h-full">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Google Sheets</h1>
            <p className="text-slate-600">Manage your Google Sheets for campaign target lists</p>
          </div>
          <Dialog open={isAddSheetModalOpen} onOpenChange={setIsAddSheetModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Sheet
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Google Sheet</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sheet Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter a name for this sheet" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sheetUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Google Sheets URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://docs.google.com/spreadsheets/d/..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="range"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Range (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="A:Z" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddSheetModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={addSheetMutation.isPending}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {addSheetMutation.isPending ? "Adding..." : "Add Sheet"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {!sheets || sheets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Sheet className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Google Sheets connected</h3>
              <p className="text-slate-600 text-center mb-4">
                Add your Google Sheets to use as data sources for your automation campaigns
              </p>
              <Button 
                onClick={() => setIsAddSheetModalOpen(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Sheet
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sheets.map((sheet: any) => (
              <Card key={sheet.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Sheet className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{sheet.name}</CardTitle>
                        <p className="text-sm text-slate-600">Range: {sheet.range || "A:Z"}</p>
                      </div>
                    </div>
                    <Badge variant={sheet.accessToken ? "default" : "outline"}>
                      {sheet.accessToken ? "Connected" : "Manual"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Sheet URL */}
                    <div>
                      <label className="text-sm font-medium text-slate-700">Sheet URL</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          value={sheet.sheetUrl}
                          readOnly
                          className="flex-1 text-sm"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(sheet.sheetUrl, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Created date */}
                    <div className="text-xs text-slate-500">
                      Created: {new Date(sheet.createdAt).toLocaleDateString()}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end pt-4 border-t border-slate-200">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteSheetMutation.mutate(sheet.id)}
                        disabled={deleteSheetMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}