import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PlusIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import { RefreshCw } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

interface InstagramAccount {
  id: number;
  username: string;
  status: 'warmup' | 'active' | 'banned' | 'inactive';
  healthScore: number;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  warmupProgress: number;
  dailyMessageCount: number;
  dailyMessageLimit: number;
  lastActivityDate: string;
  createdAt: string;
  accountAge: number;
}

const Accounts: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    twofa: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingAccount, setEditingAccount] = useState<InstagramAccount | null>(null);
  const [editFormData, setEditFormData] = useState({
    username: '',
    password: '',
    twofa: ''
  });

  // Fetch accounts
  const { data: accountsData, isLoading, refetch } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: async () => {
      const response = await fetch('/api/accounts');
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch accounts');
      }
      return data.data;
    }
  });

  const accounts: InstagramAccount[] = accountsData || [];

  // Delete account mutation
  const deleteMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete account');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: 'Success',
        description: 'Account deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete account',
        variant: 'destructive',
      });
    },
  });

  // Update account mutation
  const updateMutation = useMutation({
    mutationFn: async ({ accountId, data }: { accountId: number; data: any }) => {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update account');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      setEditingAccount(null);
      toast({
        title: 'Success',
        description: 'Account updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update account',
        variant: 'destructive',
      });
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowAddModal(false);
        setFormData({ username: '', password: '', twofa: '' });
        queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
        toast({
          title: 'Success',
          description: 'Account added successfully. Warmup process started.',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to add account',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error adding account:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add account',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'warmup':
        return <Badge className="bg-yellow-100 text-yellow-800">Warming Up</Badge>;
      case 'banned':
        return <Badge className="bg-red-100 text-red-800">Banned</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === '1970-01-01T00:00:00.000Z') {
      return 'Never';
    }
    return new Date(dateString).toLocaleDateString();
  };

  const handleDeleteAccount = (accountId: number, username: string) => {
    if (window.confirm(`Are you sure you want to delete @${username}?`)) {
      deleteMutation.mutate(accountId);
    }
  };

  const handleEditAccount = (account: InstagramAccount) => {
    setEditingAccount(account);
    setEditFormData({
      username: account.username,
      password: '', // We don't store passwords in the frontend
      twofa: ''
    });
  };

  const generateProfilePicture = (username: string) => {
    const avatar = createAvatar(avataaars, {
      seed: username,
      size: 40,
      backgroundColor: ['b6e3f4', 'c0aede', 'ffdfbf', 'ffd5dc', 'd1d4f9']
    });
    return avatar.toDataUri();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Instagram Accounts</h1>
            <p className="text-muted-foreground">Manage your connected Instagram accounts and monitor their health</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading accounts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Instagram Accounts</h1>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-8 py-3 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          size="lg"
        >
          <PlusIcon className="w-6 h-6 mr-3" />
          Add Account
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Accounts</p>
                <p className="text-2xl font-bold text-gray-900">{accounts.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <UserGroupIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {accounts.filter(a => a.status === 'active').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Warming Up</p>
                <p className="text-2xl font-bold text-gray-900">
                  {accounts.filter(a => a.status === 'warmup').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <FireIcon className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table */}
      {accounts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <img 
                          src={generateProfilePicture(account.username)} 
                          alt={`${account.username} avatar`}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <div className="font-semibold">@{account.username}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(account.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAccount(account)}
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAccount(account.id, account.username)}
                          disabled={deleteMutation.isPending}
                        >
                          <TrashIcon className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <UserGroupIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts yet</h3>
            <p className="text-gray-600 mb-6">Add your first Instagram account to start automating your outreach</p>
            <Button 
              onClick={() => setShowAddModal(true)}
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Your First Account
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Instagram Account</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter Instagram username"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter Instagram password"
                />
              </div>
              
              <div>
                <label htmlFor="twofa" className="block text-sm font-medium text-gray-700 mb-1">
                  2FA Secret (Optional)
                </label>
                <input
                  type="text"
                  id="twofa"
                  name="twofa"
                  value={formData.twofa}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter 2FA secret if enabled"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Required if your account has 2FA enabled
                </p>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? 'Adding...' : 'Add Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Account</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({
                accountId: editingAccount.id,
                data: { username: editFormData.username }
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={editFormData.username}
                    onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password (leave blank to keep current)
                  </label>
                  <input
                    type="password"
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    2FA Secret (leave blank to keep current)
                  </label>
                  <input
                    type="text"
                    value={editFormData.twofa}
                    onChange={(e) => setEditFormData({ ...editFormData, twofa: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setEditingAccount(null)}
                  disabled={updateMutation.isPending}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1"
                >
                  {updateMutation.isPending ? 'Updating...' : 'Update Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;