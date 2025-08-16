import React, { useState, useEffect } from 'react';
import { 
  UserGroupIcon, 
  MegaphoneIcon, 
  DocumentTextIcon, 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  FireIcon
} from '@heroicons/react/24/outline';

interface StatsData {
  totalAccounts: number;
  activeAccounts: number;
  totalCampaigns: number;
  totalLeads: number;
  totalTemplates: number;
  recentExecutions: number;
}

interface RecentActivity {
  id: string;
  type: 'campaign' | 'account' | 'lead' | 'template';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

const DashboardProfessional: React.FC = () => {
  const [stats, setStats] = useState<StatsData>({
    totalAccounts: 0,
    activeAccounts: 0,
    totalCampaigns: 0,
    totalLeads: 0,
    totalTemplates: 0,
    recentExecutions: 0
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'campaign',
      title: 'Summer Sale Campaign',
      description: 'Campaign completed successfully with 150 messages sent',
      timestamp: '2 hours ago',
      status: 'success'
    },
    {
      id: '2',
      type: 'account',
      title: 'Account Warmup',
      description: 'Instagram account @business_pro is warming up (Day 3/7)',
      timestamp: '4 hours ago',
      status: 'warning'
    },
    {
      id: '3',
      type: 'lead',
      title: 'Leads Imported',
      description: '500 new leads imported from "Customer List.csv"',
      timestamp: '6 hours ago',
      status: 'success'
    },
    {
      id: '4',
      type: 'template',
      title: 'Template Created',
      description: 'New message template "Welcome Series" created',
      timestamp: '1 day ago',
      status: 'info'
    }
  ]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/analytics/stats');
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'campaign':
        return <MegaphoneIcon className="w-5 h-5 text-blue-600" />;
      case 'account':
        return <UserGroupIcon className="w-5 h-5 text-green-600" />;
      case 'lead':
        return <DocumentTextIcon className="w-5 h-5 text-purple-600" />;
      case 'template':
        return <DocumentTextIcon className="w-5 h-5 text-orange-600" />;
      default:
        return <ChartBarIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-md">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your Instagram automation.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Accounts */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Accounts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalAccounts}</p>
                  <div className="flex items-center mt-2">
                    <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600">+12% from last month</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <UserGroupIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Active Accounts */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Accounts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeAccounts}</p>
                  <div className="flex items-center mt-2">
                    <FireIcon className="w-4 h-4 text-orange-500 mr-1" />
                    <span className="text-sm text-orange-600">Ready for campaigns</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Total Campaigns */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCampaigns}</p>
                  <div className="flex items-center mt-2">
                    <ArrowTrendingUpIcon className="w-4 h-4 text-blue-500 mr-1" />
                    <span className="text-sm text-blue-600">+5 this week</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MegaphoneIcon className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Total Leads */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Leads</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalLeads.toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600">+1.2k this month</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <DocumentTextIcon className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
};

export default DashboardProfessional;