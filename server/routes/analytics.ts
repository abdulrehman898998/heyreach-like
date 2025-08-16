import express from 'express';
import { storage } from '../storage';

const router = express.Router();

// Get overall dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await storage.getStats();
    const executionStats = await storage.executions.getExecutionStats();
    
    res.json({
      success: true,
      stats: {
        ...stats,
        ...executionStats
      }
    });
  } catch (error) {
    console.error('Error fetching analytics stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics statistics'
    });
  }
});

// Get account health statistics
router.get('/accounts/health', async (req, res) => {
  try {
    const accounts = await storage.accounts.getAllAccounts();
    
    const healthStats = {
      total: accounts.length,
      active: accounts.filter(a => a.status === 'active').length,
      warmup: accounts.filter(a => a.status === 'warmup').length,
      banned: accounts.filter(a => a.status === 'banned').length,
      inactive: accounts.filter(a => a.status === 'inactive').length,
      averageHealthScore: 0,
      totalFollowers: 0,
      totalFollowing: 0,
      totalPosts: 0
    };

    if (accounts.length > 0) {
      healthStats.averageHealthScore = Math.round(
        accounts.reduce((sum, acc) => sum + (acc.healthScore || 0), 0) / accounts.length
      );
      healthStats.totalFollowers = accounts.reduce((sum, acc) => sum + (acc.followersCount || 0), 0);
      healthStats.totalFollowing = accounts.reduce((sum, acc) => sum + (acc.followingCount || 0), 0);
      healthStats.totalPosts = accounts.reduce((sum, acc) => sum + (acc.postsCount || 0), 0);
    }

    res.json({
      success: true,
      data: healthStats
    });
  } catch (error) {
    console.error('Error fetching account health stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch account health statistics'
    });
  }
});

// Get campaign performance statistics
router.get('/campaigns/performance', async (req, res) => {
  try {
    const campaigns = await storage.campaigns.getAllCampaigns();
    const executions = await storage.executions.getRecentExecutions(1000); // Get more for better stats
    
    const performanceStats = {
      total: campaigns.length,
      active: campaigns.filter(c => c.status === 'active').length,
      completed: campaigns.filter(c => c.status === 'completed').length,
      paused: campaigns.filter(c => c.status === 'paused').length,
      scheduled: campaigns.filter(c => c.status === 'scheduled').length,
      totalMessagesSent: 0,
      totalMessagesFailed: 0,
      averageSuccessRate: 0,
      recentActivity: []
    };

    // Calculate message statistics
    const completedExecutions = executions.filter(e => e.status === 'completed');
    const failedExecutions = executions.filter(e => e.status === 'failed');
    
    performanceStats.totalMessagesSent = completedExecutions.length;
    performanceStats.totalMessagesFailed = failedExecutions.length;
    
    const totalExecutions = completedExecutions.length + failedExecutions.length;
    performanceStats.averageSuccessRate = totalExecutions > 0 
      ? Math.round((completedExecutions.length / totalExecutions) * 100) 
      : 0;

    // Get recent activity (last 10 executions)
    const recentExecutions = executions.slice(0, 10);
    performanceStats.recentActivity = recentExecutions.map(execution => ({
      id: execution.id,
      campaignId: execution.campaignId,
      status: execution.status,
      message: execution.message?.substring(0, 50) + '...',
      profileUrl: execution.profileUrl,
      sentAt: execution.sentAt,
      createdAt: execution.createdAt
    }));

    res.json({
      success: true,
      data: performanceStats
    });
  } catch (error) {
    console.error('Error fetching campaign performance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign performance statistics'
    });
  }
});

// Get lead statistics
router.get('/leads/stats', async (req, res) => {
  try {
    const leadFiles = await storage.leadFiles.getAllLeadFiles();
    const leads = await storage.leads.getAllLeads();
    
    const leadStats = {
      totalFiles: leadFiles.length,
      totalLeads: leads.length,
      averageLeadsPerFile: 0,
      recentImports: [],
      topColumns: []
    };

    if (leadFiles.length > 0) {
      leadStats.averageLeadsPerFile = Math.round(leads.length / leadFiles.length);
    }

    // Get recent imports
    leadStats.recentImports = leadFiles
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(file => ({
        id: file.id,
        name: file.name,
        rowCount: file.rowCount,
        createdAt: file.createdAt
      }));

    // Get most common columns
    const columnCounts: Record<string, number> = {};
    leadFiles.forEach(file => {
      file.selectedColumns?.forEach(col => {
        columnCounts[col] = (columnCounts[col] || 0) + 1;
      });
    });

    leadStats.topColumns = Object.entries(columnCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([column, count]) => ({ column, count }));

    res.json({
      success: true,
      data: leadStats
    });
  } catch (error) {
    console.error('Error fetching lead stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead statistics'
    });
  }
});

// Get template usage statistics
router.get('/templates/usage', async (req, res) => {
  try {
    const templates = await storage.templates.getAllTemplates();
    
    const templateStats = {
      total: templates.length,
      active: templates.filter(t => t.isActive).length,
      inactive: templates.filter(t => !t.isActive).length,
      averageVariables: 0,
      mostUsedVariables: []
    };

    if (templates.length > 0) {
      const totalVariables = templates.reduce((sum, template) => {
        return sum + (template.variables?.length || 0);
      }, 0);
      templateStats.averageVariables = Math.round(totalVariables / templates.length);
    }

    // Get most used variables
    const variableCounts: Record<string, number> = {};
    templates.forEach(template => {
      template.variables?.forEach(variable => {
        variableCounts[variable] = (variableCounts[variable] || 0) + 1;
      });
    });

    templateStats.mostUsedVariables = Object.entries(variableCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([variable, count]) => ({ variable, count }));

    res.json({
      success: true,
      data: templateStats
    });
  } catch (error) {
    console.error('Error fetching template usage stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template usage statistics'
    });
  }
});

// Get daily activity chart data
router.get('/activity/daily', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const executions = await storage.executions.getRecentExecutions(10000); // Get more for chart data
    
    const dailyData: Record<string, { sent: number; failed: number; total: number }> = {};
    
    // Initialize last N days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = { sent: 0, failed: 0, total: 0 };
    }

    // Count executions by date
    executions.forEach(execution => {
      if (execution.createdAt) {
        const dateKey = new Date(execution.createdAt).toISOString().split('T')[0];
        if (dailyData[dateKey]) {
          dailyData[dateKey].total++;
          if (execution.status === 'completed') {
            dailyData[dateKey].sent++;
          } else if (execution.status === 'failed') {
            dailyData[dateKey].failed++;
          }
        }
      }
    });

    const chartData = Object.entries(dailyData).map(([date, stats]) => ({
      date,
      sent: stats.sent,
      failed: stats.failed,
      total: stats.total
    }));

    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('Error fetching daily activity data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily activity data'
    });
  }
});

// Get account performance comparison
router.get('/accounts/performance', async (req, res) => {
  try {
    const accounts = await storage.accounts.getAllAccounts();
    const executions = await storage.executions.getRecentExecutions(1000);
    
    const accountPerformance = accounts.map(account => {
      const accountExecutions = executions.filter(e => e.accountId === account.id);
      const completed = accountExecutions.filter(e => e.status === 'completed').length;
      const failed = accountExecutions.filter(e => e.status === 'failed').length;
      const total = completed + failed;
      
      return {
        id: account.id,
        username: account.username,
        status: account.status,
        healthScore: account.healthScore,
        followersCount: account.followersCount,
        messagesSent: completed,
        messagesFailed: failed,
        successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        lastActivity: account.lastActivityDate
      };
    });

    res.json({
      success: true,
      data: accountPerformance
    });
  } catch (error) {
    console.error('Error fetching account performance data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch account performance data'
    });
  }
});

export default router;
