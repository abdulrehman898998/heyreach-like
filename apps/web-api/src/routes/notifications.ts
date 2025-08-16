import { Router } from 'express';
import { db, schema } from '../lib/drizzle';
import { authenticateToken } from '../lib/auth';

const router = Router();

// GET /api/notifications - List user's notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { is_read, type, limit = 50, offset = 0 } = req.query;
    
    const whereConditions = [(notifications: any, { eq }: any) => eq(notifications.user_id, req.user!.id)];
    
    if (is_read !== undefined) {
      whereConditions.push((notifications: any, { eq }: any) => eq(notifications.is_read, is_read === 'true'));
    }
    
    if (type) {
      whereConditions.push((notifications: any, { eq }: any) => eq(notifications.type, type));
    }

    const notifications = await db.query.notifications.findMany({
      where: (notifications, { and, eq }) => {
        const conditions = [eq(notifications.user_id, req.user!.id)];
        if (is_read !== undefined) conditions.push(eq(notifications.is_read, is_read === 'true'));
        if (type) conditions.push(eq(notifications.type, type as string));
        return and(...conditions);
      },
      with: {
        account: {
          columns: {
            id: true,
            username: true,
            status: true,
          }
        }
      },
      orderBy: (notifications, { desc }) => [desc(notifications.created_at)],
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
});

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const unreadCount = await db.query.notifications.findMany({
      where: (notifications, { and, eq }) => 
        and(
          eq(notifications.user_id, req.user!.id),
          eq(notifications.is_read, false)
        ),
      columns: {
        id: true,
      }
    });

    res.json({
      success: true,
      data: {
        count: unreadCount.length
      }
    });
  } catch (error) {
    console.error('Failed to get unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count'
    });
  }
});

// POST /api/notifications/:id/read - Mark notification as read
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    
    const notification = await db.query.notifications.findFirst({
      where: (notifications, { and, eq }) => 
        and(
          eq(notifications.id, notificationId),
          eq(notifications.user_id, req.user!.id)
        )
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    await db.update(schema.notifications)
      .set({ is_read: true })
      .where(schema.notifications.id.eq(notificationId));

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

// POST /api/notifications/read-all - Mark all notifications as read
router.post('/read-all', authenticateToken, async (req, res) => {
  try {
    await db.update(schema.notifications)
      .set({ is_read: true })
      .where(schema.notifications.user_id.eq(req.user!.id));

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read'
    });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    
    const notification = await db.query.notifications.findFirst({
      where: (notifications, { and, eq }) => 
        and(
          eq(notifications.id, notificationId),
          eq(notifications.user_id, req.user!.id)
        )
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    await db.delete(schema.notifications)
      .where(schema.notifications.id.eq(notificationId));

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification'
    });
  }
});

// POST /api/notifications/clear-read - Clear all read notifications
router.post('/clear-read', authenticateToken, async (req, res) => {
  try {
    await db.delete(schema.notifications)
      .where((notifications, { and, eq }) => 
        and(
          eq(notifications.user_id, req.user!.id),
          eq(notifications.is_read, true)
        )
      );

    res.json({
      success: true,
      message: 'Read notifications cleared successfully'
    });
  } catch (error) {
    console.error('Failed to clear read notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear read notifications'
    });
  }
});

// GET /api/notifications/stats - Get notification statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const notifications = await db.query.notifications.findMany({
      where: (notifications, { eq }) => eq(notifications.user_id, req.user!.id)
    });

    const totalNotifications = notifications.length;
    const unreadNotifications = notifications.filter(n => !n.is_read).length;
    const readNotifications = notifications.filter(n => n.is_read).length;

    // Group by type
    const typeStats = notifications.reduce((acc, notification) => {
      const type = notification.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by channel
    const channelStats = notifications.reduce((acc, notification) => {
      const channel = notification.channel;
      acc[channel] = (acc[channel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        total: totalNotifications,
        unread: unreadNotifications,
        read: readNotifications,
        by_type: typeStats,
        by_channel: channelStats
      }
    });
  } catch (error) {
    console.error('Failed to get notification stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification statistics'
    });
  }
});

export default router;
