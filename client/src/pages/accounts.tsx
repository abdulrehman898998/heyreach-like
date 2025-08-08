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
import { SiInstagram } from "react-icons/si";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const addAccountSchema = z.object({
  platform: z.enum(["instagram"]),
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
    queryKey: ["/api/accounts"],
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
      await apiRequest("POST", "/api/accounts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setIsAddAccountModalOpen(false);
      form.reset();
      toast({ title: "Account added" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add account", description: error?.message ?? "" , variant: "destructive" });
    }
  });

  // Edit account mutation
  const editAccountMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: AddAccountForm }) => {
      await apiRequest("PUT", `/api/accounts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setIsEditAccountModalOpen(false);
      setEditingAccount(null);
      toast({ title: "Account updated" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update account", description: error?.message ?? "", variant: "destructive" });
    }
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      await apiRequest("DELETE", `/api/accounts/${accountId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({ title: "Account deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete account", description: error?.message ?? "", variant: "destructive" });
    }
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

  const getPlatformIcon = (platform: string) => {
    return <SiInstagram className="w-5 h-5 text-pink-500" />;
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
            <h1 className="text-2xl font-bold text-slate-900">Instagram Accounts</h1>
            <p className="text-slate-600">Add your Instagram accounts to send automated messages. Your credentials are encrypted and stored securely.</p>
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
                <DialogTitle>Add Instagram Account</DialogTitle>
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
                <DialogTitle>Edit Instagram Account</DialogTitle>
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
                      {editAccountMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Accounts List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              {!Array.isArray(accounts) || accounts.length === 0 ? (
                <div className="text-center text-slate-600 py-8">
                  <p>No accounts added yet.</p>
                  <p className="text-sm">Click "Add Account" to connect your first Instagram account.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(accounts || []).map((account: any) => (
                    <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getPlatformIcon(account.platform)}
                        <div>
                          <p className="font-medium">@{account.username}</p>
                          <p className="text-sm text-slate-600">Platform: Instagram</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                          {account.status}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => openEditModal(account)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteAccountMutation.mutate(account.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => togglePasswordVisibility(account.id)}
                        >
                          {showPasswords[account.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sidebar */}
          <Card>
            <CardHeader>
              <CardTitle>Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>• Use strong passwords and enable 2FA when possible.</p>
              <p>• Accounts with stable activity perform better and get fewer blocks.</p>
              <p>• Keep a low send rate per account to stay within Instagram limits.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
