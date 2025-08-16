import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { 
  PlusIcon,
  MegaphoneIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface Campaign {
  id: number;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'failed';
  leadsCount: number;
  messagesSent: number;
  messagesFailed: number;
  messagesPending: number;
  successRate: number;
  createdAt: string;
  scheduledAt?: string;
  leadFileId?: number;
}

const Campaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingCampaign, setStartingCampaign] = useState<number | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns');
      const data = await response.json();
      if (data.success) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCampaign = async (campaignId: number) => {
    setStartingCampaign(campaignId);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (data.success) {
        // Refresh campaigns to update status
        await fetchCampaigns();
        alert('Campaign started successfully!');
      } else {
        alert(data.error || 'Failed to start campaign');
      }
    } catch (error) {
      console.error('Error starting campaign:', error);
      alert('Failed to start campaign');
    } finally {
      setStartingCampaign(null);
    }
  };

  const handlePauseCampaign = async (campaignId: number) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchCampaigns();
        alert('Campaign paused successfully!');
      } else {
        alert(data.error || 'Failed to pause campaign');
      }
    } catch (error) {
      console.error('Error pausing campaign:', error);
      alert('Failed to pause campaign');
    }
  };

  const handleDeleteCampaign = async (campaignId: number) => {
    setDeletingCampaign(campaignId);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchCampaigns();
        alert('Campaign deleted successfully!');
      } else {
        alert(data.error || 'Failed to delete campaign');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Failed to delete campaign');
    } finally {
      setDeletingCampaign(null);
      setShowDeleteConfirm(null);
    }
  };

  const handleEditCampaign = (campaignId: number) => {
    // Navigate to campaign edit page
    window.location.href = `/campaigns/${campaignId}/edit`;
  };

  const handlePreviewCampaign = (campaignId: number) => {
    // Navigate to campaign preview/analytics page
    window.location.href = `/campaigns/${campaignId}/analytics`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="badge badge-success">
            <PlayIcon className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 'paused':
        return (
          <span className="badge badge-warning">
            <PauseIcon className="w-3 h-3 mr-1" />
            Paused
          </span>
        );
      case 'completed':
        return (
          <span className="badge badge-success">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="badge badge-error">
            <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
            Failed
          </span>
        );
      default:
        return (
          <span className="badge badge-neutral">
            <ClockIcon className="w-3 h-3 mr-1" />
            Draft
          </span>
        );
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-md">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-1">Campaigns</h1>
          <p className="body-text">Manage your Instagram outreach campaigns and track their performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/campaigns/create">
            <button className="btn-primary flex items-center">
              <PlusIcon className="w-5 h-5 mr-2" />
              Create Campaign
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                <p className="text-2xl font-bold text-gray-900">{campaigns.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <MegaphoneIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
                <p className="text-2xl font-bold text-gray-900">
                  {campaigns.filter(c => c.status === 'active').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <PlayIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Messages Sent</p>
                <p className="text-2xl font-bold text-gray-900">
                  {campaigns.reduce((sum, c) => sum + (c.messagesSent || 0), 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {campaigns.length > 0 
                    ? Math.round(campaigns.reduce((sum, c) => sum + (c.successRate || 0), 0) / campaigns.length)
                    : 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="card hover:shadow-lg transition-shadow">
            <div className="card-body">
              {/* Campaign Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <MegaphoneIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                    {getStatusBadge(campaign.status)}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    onClick={() => handlePreviewCampaign(campaign.id)}
                    title="View Campaign Details"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                  <button 
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    onClick={() => handleEditCampaign(campaign.id)}
                    title="Edit Campaign"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button 
                    className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    onClick={() => setShowDeleteConfirm(campaign.id)}
                    title="Delete Campaign"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Delete Confirmation Modal */}
              {showDeleteConfirm === campaign.id && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Campaign</h3>
                    <p className="text-gray-600 mb-6">
                      Are you sure you want to delete "{campaign.name}"? This action cannot be undone.
                    </p>
                    <div className="flex space-x-3">
                      <button
                        className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                        onClick={() => setShowDeleteConfirm(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        disabled={deletingCampaign === campaign.id}
                      >
                        {deletingCampaign === campaign.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Campaign Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Leads</p>
                  <p className="text-2xl font-bold text-gray-900">{(campaign.leadsCount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Sent</p>
                  <p className="text-2xl font-bold text-gray-900">{(campaign.messagesSent || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Success Rate */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className={`text-sm font-medium ${getSuccessRateColor(campaign.successRate || 0)}`}>
                    {(campaign.successRate || 0).toFixed(1)}%
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${campaign.successRate || 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <p className="text-sm font-bold text-green-700">{campaign.messagesSent || 0}</p>
                  <p className="text-xs text-green-600">Sent</p>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded-lg">
                  <p className="text-sm font-bold text-yellow-700">{campaign.messagesPending || 0}</p>
                  <p className="text-xs text-yellow-600">Pending</p>
                </div>
                <div className="text-center p-2 bg-red-50 rounded-lg">
                  <p className="text-sm font-bold text-red-700">{campaign.messagesFailed || 0}</p>
                  <p className="text-xs text-red-600">Failed</p>
                </div>
              </div>

              {/* Campaign Actions */}
              <div className="flex space-x-2">
                {/* Start/Resume Button - Show for draft, paused, and completed campaigns */}
                {(campaign.status === 'draft' || campaign.status === 'paused' || campaign.status === 'completed') && (
                  <button 
                    className="flex-1 btn-primary text-sm py-2"
                    onClick={() => handleStartCampaign(campaign.id)}
                    disabled={startingCampaign === campaign.id}
                  >
                    <PlayIcon className="w-4 h-4 mr-1" />
                    {startingCampaign === campaign.id ? 'Starting...' : 
                     campaign.status === 'draft' ? 'Start' : 'Resume'}
                  </button>
                )}
                
                {/* Pause Button - Show for active campaigns */}
                {campaign.status === 'active' && (
                  <button 
                    className="flex-1 btn-secondary text-sm py-2"
                    onClick={() => handlePauseCampaign(campaign.id)}
                  >
                    <PauseIcon className="w-4 h-4 mr-1" />
                    Pause
                  </button>
                )}
                
                {/* Analytics Button - Show for all campaigns */}
                <button 
                  className="btn-secondary text-sm py-2 px-3"
                  onClick={() => handlePreviewCampaign(campaign.id)}
                  title="View Analytics"
                >
                  <ChartBarIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Created Date */}
              <div className="text-xs text-gray-500 mt-3">
                Created: {new Date(campaign.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {campaigns.length === 0 && (
        <div className="text-center py-12">
          <MegaphoneIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
          <p className="text-gray-600 mb-6">Create your first campaign to start automating your Instagram outreach</p>
          <Link href="/campaigns/create">
            <button className="btn-primary">
              <PlusIcon className="w-5 h-5 mr-2" />
              Create Your First Campaign
            </button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default Campaigns;
