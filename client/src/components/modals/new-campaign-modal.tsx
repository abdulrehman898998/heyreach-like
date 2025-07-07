import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  platform: z.enum(["instagram", "facebook"]),
  googleSheetId: z.number().min(1, "Please select a Google Sheet"),
  messagesPerAccount: z.number().min(1, "Must be at least 1").max(1000, "Cannot exceed 1000"),
  delayBetweenMessages: z.number().min(5, "Minimum delay is 5 seconds").max(300, "Maximum delay is 300 seconds"),
});

type CreateCampaignForm = z.infer<typeof createCampaignSchema>;

interface NewCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewCampaignModal({ open, onOpenChange }: NewCampaignModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Google Sheets
  const { data: googleSheets } = useQuery({
    queryKey: ["/api/google-sheets"],
    enabled: open,
  });

  // Form
  const form = useForm<CreateCampaignForm>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      name: "",
      platform: "instagram",
      messagesPerAccount: 50,
      delayBetweenMessages: 30,
    },
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (data: CreateCampaignForm) => {
      await apiRequest("POST", "/api/campaigns", data);
    },
    onSuccess: () => {
      toast({
        title: "Campaign Created",
        description: "Your campaign has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      onOpenChange(false);
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
        description: "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateCampaignForm) => {
    createCampaignMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
          <p className="text-sm text-slate-600 mt-1">
            Create an automated campaign to send personalized messages to your target profiles using data from Google Sheets.
          </p>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Q1 Outreach Campaign" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="googleSheetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Google Sheet Data Source</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    value={field.value?.toString() || ""}
                    key={field.value} // Force re-render when value changes
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={googleSheets?.length > 0 ? "Choose your Google Sheet" : "No Google Sheets connected"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {googleSheets?.length > 0 ? (
                        googleSheets.map((sheet: any) => (
                          <SelectItem key={sheet.id} value={sheet.id.toString()}>
                            {sheet.name} ({sheet.range || 'A:B'})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          Connect a Google Sheet first
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {googleSheets?.length === 0 && (
                    <p className="text-sm text-amber-600">
                      Go to Google Sheets page to connect your data source first.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="messagesPerAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Messages per Account (Daily Limit)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="50"
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <p className="text-xs text-slate-500">
                      Recommended: 30-50 messages per account per day to avoid limits
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="delayBetweenMessages"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delay Between Messages (seconds)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="30"
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <p className="text-xs text-slate-500">
                      Minimum 5 seconds. Higher delays (30-60s) appear more natural and reduce detection risk
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createCampaignMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
