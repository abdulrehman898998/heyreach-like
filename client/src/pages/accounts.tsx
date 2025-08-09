import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Instagram, Trash2, Edit, CheckCircle, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Account {
  id: number;
  username: string;
  status: 'active' | 'inactive' | 'banned';
  createdAt: string;
}

export default function AccountsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");

  // Fetch accounts
  const { data: accountsData, isLoading } = useQuery({ 
    queryKey: ["/api/accounts"],
    retry: false
  });
  
  const accounts = accountsData?.accounts || [];

  // Add account mutation
  const addAccountMutation = useMutation({
    mutationFn: async (username: string) => {
      return apiRequest("/api/accounts", {
        method: 'POST',
        body: JSON.stringify({ username })
      });
    },
    onSuccess: () => {
      toast({
        title: "Account added",
        description: "Instagram account has been added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      setIsDialogOpen(false);
      setNewUsername("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add account",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      return apiRequest(`/api/accounts/${accountId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: "Account removed",
        description: "Instagram account has been removed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove account",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  const handleAddAccount = () => {
    if (!newUsername.trim()) {
      toast({
        title: "Username required",
        description: "Please enter a valid Instagram username",
        variant: "destructive",
      });
      return;
    }
    addAccountMutation.mutate(newUsername.trim());
  };

  const handleDeleteAccount = (accountId: number) => {
    deleteAccountMutation.mutate(accountId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'inactive': return <XCircle className="h-4 w-4 text-gray-600" />;
      case 'banned': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <XCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'banned': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading accounts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Instagram Accounts</h1>
          <p className="text-gray-600 mt-2">Manage your Instagram accounts for automation</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Instagram Account</DialogTitle>
              <DialogDescription>
                Enter the Instagram username you want to use for automation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Instagram Username</Label>
                <Input
                  id="username"
                  placeholder="@username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddAccount()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddAccount}
                disabled={addAccountMutation.isPending}
              >
                {addAccountMutation.isPending ? "Adding..." : "Add Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Instagram className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts yet</h3>
            <p className="text-gray-500 text-center mb-6 max-w-md">
              Add your Instagram accounts to start automating outreach campaigns. You can manage multiple accounts from here.
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Instagram Account</DialogTitle>
                  <DialogDescription>
                    Enter the Instagram username you want to use for automation.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username">Instagram Username</Label>
                    <Input
                      id="username"
                      placeholder="@username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddAccount()}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddAccount}
                    disabled={addAccountMutation.isPending}
                  >
                    {addAccountMutation.isPending ? "Adding..." : "Add Account"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {accounts.map((account: Account) => (
            <Card key={account.id} className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                      <Instagram className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">@{account.username}</h3>
                        {getStatusIcon(account.status)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusColor(account.status)}>
                          {account.status}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          Added {new Date(account.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteAccount(account.id)}
                      disabled={deleteAccountMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}