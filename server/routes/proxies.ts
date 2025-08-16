import { Router } from 'express';
import { getDatabase } from '../db.js';
import { proxies } from '../../shared/schema.js';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Validation schemas
const addProxySchema = z.object({
  provider: z.string().min(1),
  endpoint_template: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  country: z.string().optional(),
  sticky_supported: z.boolean().default(true),
});

// GET /api/proxies - List proxies
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const proxyList = await db.select().from(proxies).orderBy(desc(proxies.created_at));

    res.json({
      success: true,
      proxies: proxyList,
    });

  } catch (error) {
    console.error('Error fetching proxies:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// POST /api/proxies - Add proxy
router.post('/', async (req, res) => {
  try {
    const proxyData = addProxySchema.parse(req.body);
    const db = getDatabase();

    const [newProxy] = await db.insert(proxies).values({
      ...proxyData,
      status: 'available',
    }).returning();

    res.json({
      success: true,
      proxy: newProxy,
    });

  } catch (error) {
    console.error('Error adding proxy:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// PUT /api/proxies/:id - Update proxy
router.put('/:id', async (req, res) => {
  try {
    const proxyId = parseInt(req.params.id);
    const updateData = addProxySchema.partial().parse(req.body);
    const db = getDatabase();

    const [updatedProxy] = await db.update(proxies)
      .set({
        ...updateData,
        updated_at: new Date(),
      })
      .where(eq(proxies.id, proxyId))
      .returning();

    if (!updatedProxy) {
      return res.status(404).json({ error: 'Proxy not found' });
    }

    res.json({
      success: true,
      proxy: updatedProxy,
    });

  } catch (error) {
    console.error('Error updating proxy:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// DELETE /api/proxies/:id - Delete proxy
router.delete('/:id', async (req, res) => {
  try {
    const proxyId = parseInt(req.params.id);
    const db = getDatabase();

    const [deletedProxy] = await db.delete(proxies)
      .where(eq(proxies.id, proxyId))
      .returning();

    if (!deletedProxy) {
      return res.status(404).json({ error: 'Proxy not found' });
    }

    res.json({
      success: true,
      message: 'Proxy deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting proxy:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

export default router;
