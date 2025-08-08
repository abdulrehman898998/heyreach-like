import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
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

  // Form
  const form = useForm<CreateCampaignForm>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      name: "",
      messagesPerAccount: 50,
      delayBetweenMessages: 30,
    },
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (data: CreateCampaignForm) => {
      const response = await apiRequest("POST", "/api/campaigns", {
        name: data.name,
        scheduling: {
          maxMessagesPerDay: data.messagesPerAccount,
          delayBetweenMessages: data.delayBetweenMessages,
        },
        startNow: false,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Campaign Created",
        description: "Redirecting to campaign setup...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      onOpenChange(false);
      form.reset();
      
      // Redirect to the full campaign creation page
      setTimeout(() => {
        // Check if data has the expected structure
        if (data && data.campaign && data.campaign.id) {
          window.location.href = `/campaigns/create?id=${data.campaign.id}`;
        } else {
          // Fallback: redirect without ID, the page can handle it
          window.location.href = `/campaigns/create`;
        }
      }, 1000);
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
            Name your campaign and set delivery limits. You will map columns and compose the message in the next step.
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
            </div>

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
