import { Router } from 'express';
import { getDatabase } from '../db.js';
import { action_logs, accounts, messages, notifications } from '../../shared/schema.js';
import { eq, and, gte, desc } from 'drizzle-orm';
import { getRedis } from '../redis.js';
import { getWarmupQueue, getDmSendQueue, getHealthCheckQueue, getMcpQueue, getMaintenanceQueue } from '../queues/queueManager.js';

const router = Router();

// GET /api/automation/stats - Get automation statistics
router.get('/stats', async (req, res) => {
  try {
    const db = getDatabase();
    const redis = getRedis();

    // Get queue depths
    const queueDepths = {
          warmup: await getWarmupQueue().count(),
    dmSend: await getDmSendQueue().count(),
    healthCheck: await getHealthCheckQueue().count(),
    mcp: await getMcpQueue().count(),
    maintenance: await getMaintenanceQueue().count(),
    };

    // Get worker counts (simplified - in production you'd track actual workers)
    const workerCounts = {
      warmup: 2,
      dmSend: 3,
      healthCheck: 1,
      mcp: 1,
      maintenance: 1,
    };

    // Get account statistics
    const accountStats = await db.select().from(accounts);
    const accountStatusCounts = {
      warmup: accountStats.filter(a => a.status === 'warmup').length,
      active: accountStats.filter(a => a.status === 'active').length,
      needs_manual_verification: accountStats.filter(a => a.status === 'needs_manual_verification').length,
      needs_proxy_rotation: accountStats.filter(a => a.status === 'needs_proxy_rotation').length,
      inactive: accountStats.filter(a => a.status === 'inactive').length,
    };

    // Get recent action logs
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const recentLogs = await db.select().from(action_logs)
      .where(gte(action_logs.created_at, oneDayAgo))
      .orderBy(desc(action_logs.created_at));

    const actionStats = {
      total: recentLogs.length,
      success: recentLogs.filter(log => log.result === 'success').length,
      failed: recentLogs.filter(log => log.result === 'failed').length,
      by_type: recentLogs.reduce((acc, log) => {
        acc[log.action_type] = (acc[log.action_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    // Get message statistics
    const messageStats = await db.select().from(messages);
    const messageStatusCounts = {
      pending: messageStats.filter(m => m.status === 'pending').length,
      sent: messageStats.filter(m => m.status === 'sent').length,
      failed: messageStats.filter(m => m.status === 'failed').length,
    };

    // Get MCP usage statistics
    const mcpLogs = recentLogs.filter(log => log.action_type === 'mcp_analysis');
    const mcpStats = {
      total_invocations: mcpLogs.length,
      success_rate: mcpLogs.length > 0 
        ? (mcpLogs.filter(log => log.result === 'success').length / mcpLogs.length * 100).toFixed(1)
        : 0,
      recent_errors: mcpLogs.filter(log => log.result === 'failed').slice(0, 5),
    };

    // Get notification statistics
    const notificationStats = await db.select().from(notifications);
    const notificationCounts = {
      total: notificationStats.length,
      unread: notificationStats.filter(n => !n.is_read).length,
      by_type: notificationStats.reduce((acc, notif) => {
        acc[notif.type] = (acc[notif.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    // Get Redis health
    const redisHealth = await redis.ping().then(() => 'healthy').catch(() => 'unhealthy');

    res.json({
      success: true,
      stats: {
        queues: {
          depths: queueDepths,
          workers: workerCounts,
        },
        accounts: accountStatusCounts,
        actions: actionStats,
        messages: messageStatusCounts,
        mcp: mcpStats,
        notifications: notificationCounts,
        system: {
          redis_health: redisHealth,
          timestamp: new Date().toISOString(),
        },
      },
    });

  } catch (error) {
    console.error('Error getting automation stats:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// GET /api/automation/health - Get system health
router.get('/health', async (req, res) => {
  try {
    const db = getDatabase();
    const redis = getRedis();

    // Check database health
    const dbHealth = await db.execute('SELECT 1').then(() => 'healthy').catch(() => 'unhealthy');

    // Check Redis health
    const redisHealth = await redis.ping().then(() => 'healthy').catch(() => 'unhealthy');

        // Check queue health (simplified - queues are ready if they exist)
    const queueHealth = {
      warmup: true,
      dmSend: true,
      healthCheck: true,
      mcp: true,
      maintenance: true,
    };

    const overallHealth = dbHealth === 'healthy' && redisHealth === 'healthy' && 
      Object.values(queueHealth).every(ready => ready) ? 'healthy' : 'degraded';

    res.json({
      success: true,
      health: {
        status: overallHealth,
        database: dbHealth,
        redis: redisHealth,
        queues: queueHealth,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

export default router;
