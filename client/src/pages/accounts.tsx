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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Eye, EyeOff, Edit } from "lucide-react";
import { SiInstagram, SiFacebook } from "react-icons/si";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const addAccountSchema = z.object({
  platform: z.enum(["instagram", "facebook"]),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  twofa: z.string().optional(),
});

type AddAccountForm = z.infer<typeof addAccountSchema>;

export default function Accounts() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [showPasswords, setShowPasswords] = useState<{ [key: number]: boolean }>({});

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

  // Fetch social accounts
  const { data: accounts, error: accountsError, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["/api/social-accounts"],
    enabled: isAuthenticated,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (accountsError && isUnauthorizedError(accountsError as Error)) {
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
  }, [accountsError, toast]);

  // Add account form
  const form = useForm<AddAccountForm>({
    resolver: zodResolver(addAccountSchema),
    defaultValues: {
      platform: "instagram",
      username: "",
      password: "",
      twofa: "",
    },
  });

  const editForm = useForm<AddAccountForm>({
    resolver: zodResolver(addAccountSchema),
    defaultValues: {
      platform: "instagram",
      username: "",
      password: "",
      twofa: "",
    },
  });

  // Add account mutation
  const addAccountMutation = useMutation({
    mutationFn: async (data: AddAccountForm) => {
      await apiRequest("POST", "/api/social-accounts", data);
    },
    onSuccess: () => {
      toast({
        title: "Account Added",
        description: "Social media account has been added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
      setIsAddAccountModalOpen(false);
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
        description: "Failed to add account",
        variant: "destructive",
      });
    },
  });

  // Edit account mutation
  const editAccountMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: AddAccountForm }) => {
      await apiRequest("PUT", `/api/social-accounts/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Account Updated",
        description: "Social media account has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
      setIsEditAccountModalOpen(false);
      setEditingAccount(null);
      editForm.reset();
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
        description: "Failed to update account",
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      await apiRequest("DELETE", `/api/social-accounts/${accountId}`);
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Social media account has been deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
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
        description: "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddAccountForm) => {
    addAccountMutation.mutate(data);
  };

  const onEditSubmit = (data: AddAccountForm) => {
    if (editingAccount) {
      editAccountMutation.mutate({ id: editingAccount.id, data });
    }
  };

  const openEditModal = (account: any) => {
    setEditingAccount(account);
    editForm.reset({
      platform: account.platform,
      username: account.username,
      password: atob(account.password),
      twofa: account.twofa || "",
    });
    setIsEditAccountModalOpen(true);
  };

  const connectInstagramWebhook = async (accountId: number) => {
    try {
      const response = await fetch(`/api/auth/instagram/${accountId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to start Instagram connection",
          variant: "destructive",
        });
        return;
      }

      const { authUrl } = await response.json();
      
      // Open Instagram OAuth in popup
      const popup = window.open(
        authUrl,
        'instagram-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Listen for popup messages and completion
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'instagram_connected') {
          if (event.data.success) {
            // Refresh accounts data
            queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
            toast({
              title: "Instagram Connected",
              description: "Your Instagram account is now connected for webhook replies",
            });
          } else {
            toast({
              title: "Connection Failed",
              description: event.data.error || "Failed to connect Instagram webhook",
              variant: "destructive",
            });
          }
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Fallback: check if popup closed without message
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          // Only show fallback if we didn't already get a message
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
          }, 1000);
        }
      }, 1000);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect Instagram webhook",
        variant: "destructive",
      });
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <SiInstagram className="w-5 h-5 text-pink-500" />;
      case 'facebook':
        return <SiFacebook className="w-5 h-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const togglePasswordVisibility = (accountId: number) => {
    setShowPasswords(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  if (isLoading || isLoadingAccounts) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading accounts...</p>
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
            <h1 className="text-2xl font-bold text-slate-900">Social Media Accounts</h1>
            <p className="text-slate-600">Add your Instagram and Facebook accounts to send automated messages. Your credentials are encrypted and stored securely.</p>
          </div>
          <Dialog open={isAddAccountModalOpen} onOpenChange={setIsAddAccountModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Social Media Account</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="twofa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>2FA Secret (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter 2FA secret if enabled" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddAccountModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={addAccountMutation.isPending}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {addAccountMutation.isPending ? "Adding..." : "Add Account"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Edit Account Modal */}
          <Dialog open={isEditAccountModalOpen} onOpenChange={setIsEditAccountModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Social Media Account</DialogTitle>
              </DialogHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <FormField
                    control={editForm.control}
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
                  <FormField
                    control={editForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="twofa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>2FA Secret (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter 2FA secret if enabled" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditAccountModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={editAccountMutation.isPending}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {editAccountMutation.isPending ? "Updating..." : "Update Account"}
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
        {!accounts || accounts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No accounts connected</h3>
              <p className="text-slate-600 text-center mb-4">
                Add your Instagram and Facebook accounts to start automating your outreach.<br/>
                <span className="text-amber-600 font-medium text-sm">Note: For Instagram reply tracking, your account must be linked to a Facebook Business Page.</span>
              </p>
              <Button 
                onClick={() => setIsAddAccountModalOpen(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account: any) => (
              <Card key={account.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getPlatformIcon(account.platform)}
                      <div>
                        <CardTitle className="text-lg">@{account.username}</CardTitle>
                        <p className="text-sm text-slate-600 capitalize">{account.platform}</p>
                      </div>
                    </div>
                    <Badge variant={account.isActive ? "default" : "secondary"}>
                      {account.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Password field */}
                    <div>
                      <label className="text-sm font-medium text-slate-700">Password</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          type={showPasswords[account.id] ? "text" : "password"}
                          value={showPasswords[account.id] ? atob(account.password) : "••••••••••"}
                          readOnly
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => togglePasswordVisibility(account.id)}
                          title={showPasswords[account.id] ? "Hide password" : "Show password"}
                        >
                          {showPasswords[account.id] ? 
                            <EyeOff className="w-4 h-4" /> : 
                            <Eye className="w-4 h-4" />
                          }
                        </Button>
                      </div>
                    </div>

                    {/* 2FA Status */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">2FA Enabled</span>
                      <Badge variant={account.twofa ? "default" : "outline"}>
                        {account.twofa ? "Yes" : "No"}
                      </Badge>
                    </div>

                    {/* Last used */}
                    {account.lastUsed && (
                      <div className="text-xs text-slate-500">
                        Last used: {new Date(account.lastUsed).toLocaleDateString()}
                      </div>
                    )}

                    {/* Webhook Connection for Instagram */}
                    {account.platform === 'instagram' && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Webhook Connected</span>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={account.webhookConnected ? "default" : "outline"}
                            className={account.webhookConnected ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}
                          >
                            {account.webhookConnected ? "✓ Connected" : "Not Connected"}
                          </Badge>
                          {!account.webhookConnected && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => connectInstagramWebhook(account.id)}
                            >
                              Connect
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(account)}
                        title="Edit account"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteAccountMutation.mutate(account.id)}
                        disabled={deleteAccountMutation.isPending}
                        title="Delete account"
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
