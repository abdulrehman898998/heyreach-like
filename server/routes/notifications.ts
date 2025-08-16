import { Router } from 'express';
import { getDatabase } from '../db.js';
import { notifications } from '../../shared/schema.js';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Validation schemas
const markReadSchema = z.object({
  notificationIds: z.array(z.number()).optional(),
  markAll: z.boolean().optional(),
});

// GET /api/notifications - Get user notifications
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const userId = 1; // TODO: Get from auth

    const notificationList = await db.query.notifications.findMany({
      where: eq(notifications.user_id, userId),
      orderBy: [desc(notifications.created_at)],
    });

    res.json({
      success: true,
      notifications: notificationList,
      unread_count: notificationList.filter(n => !n.is_read).length,
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// POST /api/notifications/mark-read - Mark notifications as read
router.post('/mark-read', async (req, res) => {
  try {
    const { notificationIds, markAll } = markReadSchema.parse(req.body);
    const db = getDatabase();
    const userId = 1; // TODO: Get from auth

    if (markAll) {
      // Mark all notifications as read
      await db.update(notifications)
        .set({
          is_read: true,
        })
        .where(eq(notifications.user_id, userId));
    } else if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      // TODO: Use IN operator for multiple IDs
      for (const id of notificationIds) {
        await db.update(notifications)
          .set({
            is_read: true,
          })
          .where(eq(notifications.id, id));
      }
    } else {
      return res.status(400).json({ error: 'No notifications specified' });
    }

    res.json({
      success: true,
      message: 'Notifications marked as read',
    });

  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const db = getDatabase();
    const userId = 1; // TODO: Get from auth

    const deletedNotification = await db.delete(notifications)
      .where(eq(notifications.id, notificationId))
      .returning();

    if (deletedNotification.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

export default router;
