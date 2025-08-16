import { db, schema } from '../lib/drizzle';
import { ACCOUNT_STATUS, CAMPAIGN_STATUS } from '@heyreach/shared/constants';

// Get automation statistics for a user
export async function getAutomationStats(userId: number) {
  try {
    // Get account statistics
    const accounts = await db.query.accounts.findMany({
      where: (accounts, { eq }) => eq(accounts.user_id, userId)
    });

    const totalAccounts = accounts.length;
    const activeAccounts = accounts.filter(acc => acc.status === ACCOUNT_STATUS.ACTIVE).length;
    const warmingAccounts = accounts.filter(acc => acc.status === ACCOUNT_STATUS.WARMING).length;
    const pausedAccounts = accounts.filter(acc => acc.status === ACCOUNT_STATUS.PAUSED).length;
    const needsVerificationAccounts = accounts.filter(acc => acc.status === ACCOUNT_STATUS.NEEDS_MANUAL_VERIFICATION).length;

    // Get campaign statistics
    const campaigns = await db.query.campaigns.findMany({
      where: (campaigns, { eq }) => eq(campaigns.user_id, userId)
    });

    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(camp => camp.status === CAMPAIGN_STATUS.ACTIVE).length;
    const draftCampaigns = campaigns.filter(camp => camp.status === CAMPAIGN_STATUS.DRAFT).length;
    const pausedCampaigns = campaigns.filter(camp => camp.status === CAMPAIGN_STATUS.PAUSED).length;

    // Get lead statistics
    const leads = await db.query.leads.findMany({
      where: (leads, { eq }) => eq(leads.user_id, userId)
    });

    const totalLeads = leads.length;
    const pendingLeads = leads.filter(lead => lead.status === 'pending').length;
    const sentLeads = leads.filter(lead => lead.status === 'sent').length;
    const failedLeads = leads.filter(lead => lead.status === 'failed').length;

    // Get message statistics
    const messages = await db.query.messages.findMany({
      with: {
        campaign: {
          columns: {
            user_id: true,
          }
        }
      }
    });

    const userMessages = messages.filter(msg => msg.campaign?.user_id === userId);
    const totalMessages = userMessages.length;
    const sentMessages = userMessages.filter(msg => msg.status === 'sent').length;
    const failedMessages = userMessages.filter(msg => msg.status === 'failed').length;

    // Get proxy statistics
    const proxies = await db.query.proxies.findMany();
    const totalProxies = proxies.length;
    const healthyProxies = proxies.filter(proxy => proxy.health_status === 'ok').length;
    const degradedProxies = proxies.filter(proxy => proxy.health_status === 'degraded').length;
    const deadProxies = proxies.filter(proxy => proxy.health_status === 'dead').length;
    const assignedProxies = proxies.filter(proxy => proxy.assigned_account_id).length;

    // Get notification statistics
    const notifications = await db.query.notifications.findMany({
      where: (notifications, { eq }) => eq(notifications.user_id, userId)
    });

    const totalNotifications = notifications.length;
    const unreadNotifications = notifications.filter(notif => !notif.is_read).length;

    return {
      accounts: {
        total: totalAccounts,
        active: activeAccounts,
        warming: warmingAccounts,
        paused: pausedAccounts,
        needs_verification: needsVerificationAccounts,
      },
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
        draft: draftCampaigns,
        paused: pausedCampaigns,
      },
      leads: {
        total: totalLeads,
        pending: pendingLeads,
        sent: sentLeads,
        failed: failedLeads,
        success_rate: totalLeads > 0 ? (sentLeads / totalLeads) * 100 : 0,
      },
      messages: {
        total: totalMessages,
        sent: sentMessages,
        failed: failedMessages,
        success_rate: totalMessages > 0 ? (sentMessages / totalMessages) * 100 : 0,
      },
      proxies: {
        total: totalProxies,
        healthy: healthyProxies,
        degraded: degradedProxies,
        dead: deadProxies,
        assigned: assignedProxies,
        available: totalProxies - assignedProxies,
      },
      notifications: {
        total: totalNotifications,
        unread: unreadNotifications,
      },
      queue_depth: {
        warmup: 0, // Placeholder - would be calculated from BullMQ
        dm_send: 0,
        health_check: 0,
        mcp: 0,
        maintenance: 0,
      },
      mcp_usage: {
        total_invocations: 0,
        success_rate: 0,
        last_24h: 0,
      },
      proxy_rotations: {
        last_24h: 0,
        accounts_paused_proxy_issue: 0,
      },
    };
  } catch (error) {
    console.error('Failed to get automation stats:', error);
    throw error;
  }
}

// Create notification
export async function createNotification(
  userId: number,
  type: string,
  channel: 'email' | 'in_app',
  payload: any,
  accountId?: number
) {
  try {
    const [notification] = await db.insert(schema.notifications).values({
      user_id: userId,
      account_id: accountId,
      type,
      channel,
      payload,
      is_read: false,
    }).returning();

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: number, userId: number) {
  try {
    await db.update(schema.notifications)
      .set({ is_read: true })
      .where((notifications, { and, eq }) => 
        and(
          eq(notifications.id, notificationId),
          eq(notifications.user_id, userId)
        )
      );
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
}

// Get unread notification count
export async function getUnreadNotificationCount(userId: number) {
  try {
    const unreadNotifications = await db.query.notifications.findMany({
      where: (notifications, { and, eq }) => 
        and(
          eq(notifications.user_id, userId),
          eq(notifications.is_read, false)
        ),
      columns: {
        id: true,
      }
    });

    return unreadNotifications.length;
  } catch (error) {
    console.error('Failed to get unread notification count:', error);
    throw error;
  }
}
