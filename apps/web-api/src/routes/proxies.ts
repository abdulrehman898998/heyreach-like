import { Router } from 'express';
import { z } from 'zod';
import { db, schema } from '../lib/drizzle';
import { authenticateToken } from '../lib/auth';
import { PROXY_STATUS } from '@heyreach/shared/constants';
import { eq } from 'drizzle-orm';

const router: Router = Router();

// GET /api/proxies - List all proxies (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, ip_type, country, limit = 50, offset = 0 } = req.query;
    
    const whereConditions = [];
    
    if (status) {
      whereConditions.push((proxies: any, { eq }: any) => eq(proxies.status, status));
    }
    
    if (ip_type) {
      whereConditions.push((proxies: any, { eq }: any) => eq(proxies.ip_type, ip_type));
    }
    
    if (country) {
      whereConditions.push((proxies: any, { eq }: any) => eq(proxies.country, country));
    }

    const proxies = await db.query.proxies.findMany({
      where: (proxies, { and, eq }) => {
        const conditions = [];
        if (status) conditions.push(eq(proxies.status, status as 'active' | 'inactive' | 'testing'));
        if (ip_type) conditions.push(eq(proxies.ip_type, ip_type as 'residential' | 'mobile' | 'datacenter'));
        if (country) conditions.push(eq(proxies.country, country as string));
        return conditions.length > 0 ? and(...conditions) : undefined;
      },
      with: {
        assigned_account: {
          columns: {
            id: true,
            username: true,
            status: true,
          }
        }
      },
      orderBy: (proxies, { desc }) => [desc(proxies.created_at)],
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    // Mask sensitive data
    const maskedProxies = proxies.map(proxy => ({
      ...proxy,
      username: proxy.username.substring(0, 3) + '***',
      password: '***',
      endpoint_template: proxy.endpoint_template.replace(/\/\/.*@/, '//***:***@'),
    }));

    res.json({
      success: true,
      data: maskedProxies
    });
  } catch (error) {
    console.error('Failed to fetch proxies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch proxies'
    });
  }
});

// POST /api/proxies - Register new proxy
router.post('/', authenticateToken, async (req, res) => {
  try {
    const validatedData = req.body;

    // Check if proxy with same endpoint template already exists
    const existingProxy = await db.query.proxies.findFirst({
      where: (proxies, { eq }) => eq(proxies.endpoint_template, validatedData.endpoint_template)
    });

    if (existingProxy) {
      return res.status(400).json({
        success: false,
        error: 'Proxy with this endpoint template already exists'
      });
    }

    // Create proxy
    const [proxy] = await db.insert(schema.proxies).values({
      provider: validatedData.provider,
      endpoint_template: validatedData.endpoint_template,
      username: validatedData.username,
      password: validatedData.password,
      ip_type: validatedData.ip_type,
      country: validatedData.country,
      city: validatedData.city,
      rotation_mode: 'sticky',
      sticky_supported: validatedData.sticky_supported ?? true,
      health_status: 'ok',
      status: PROXY_STATUS.ACTIVE,
    }).returning();

    // Mask sensitive data in response
    const maskedProxy = {
      ...proxy,
      username: proxy.username.substring(0, 3) + '***',
      password: '***',
      endpoint_template: proxy.endpoint_template.replace(/\/\/.*@/, '//***:***@'),
    };

    res.status(201).json({
      success: true,
      data: maskedProxy
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Failed to create proxy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create proxy'
    });
  }
});

// GET /api/proxies/:id - Get proxy details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const proxyId = parseInt(req.params.id);
    
    const proxy = await db.query.proxies.findFirst({
      where: (proxies, { eq }) => eq(proxies.id, proxyId),
      with: {
        assigned_account: {
          columns: {
            id: true,
            username: true,
            status: true,
          }
        },
        proxy_bindings: {
          orderBy: (bindings, { desc }) => [desc(bindings.bound_at)],
          limit: 10
        }
      }
    });

    if (!proxy) {
      return res.status(404).json({
        success: false,
        error: 'Proxy not found'
      });
    }

    // Mask sensitive data
    const maskedProxy = {
      ...proxy,
      username: proxy.username.substring(0, 3) + '***',
      password: '***',
      endpoint_template: proxy.endpoint_template.replace(/\/\/.*@/, '//***:***@'),
    };

    res.json({
      success: true,
      data: maskedProxy
    });
  } catch (error) {
    console.error('Failed to fetch proxy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch proxy'
    });
  }
});

// PUT /api/proxies/:id - Update proxy
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const proxyId = parseInt(req.params.id);
    const { status, health_status, latency_ms, fail_rate, score } = req.body;
    
    const proxy = await db.query.proxies.findFirst({
      where: (proxies, { eq }) => eq(proxies.id, proxyId)
    });

    if (!proxy) {
      return res.status(404).json({
        success: false,
        error: 'Proxy not found'
      });
    }

    // Update proxy
    const [updatedProxy] = await db.update(schema.proxies)
      .set({
        status: status || proxy.status,
        health_status: health_status || proxy.health_status,
        latency_ms: latency_ms !== undefined ? latency_ms : proxy.latency_ms,
        fail_rate: fail_rate !== undefined ? fail_rate : proxy.fail_rate,
        score: score !== undefined ? score : proxy.score,
        last_used_at: new Date(),
      })
      .where(eq(schema.proxies.id, proxyId))
      .returning();

    // Mask sensitive data
    const maskedProxy = {
      ...updatedProxy,
      username: updatedProxy.username.substring(0, 3) + '***',
      password: '***',
      endpoint_template: updatedProxy.endpoint_template.replace(/\/\/.*@/, '//***:***@'),
    };

    res.json({
      success: true,
      data: maskedProxy
    });
  } catch (error) {
    console.error('Failed to update proxy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update proxy'
    });
  }
});

// DELETE /api/proxies/:id - Delete proxy
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const proxyId = parseInt(req.params.id);
    
    const proxy = await db.query.proxies.findFirst({
      where: (proxies, { eq }) => eq(proxies.id, proxyId)
    });

    if (!proxy) {
      return res.status(404).json({
        success: false,
        error: 'Proxy not found'
      });
    }

    // Check if proxy is assigned to any account
    if (proxy.assigned_account_id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete proxy that is assigned to an account'
      });
    }

    // Delete proxy bindings first
    await db.delete(schema.proxy_bindings)
      .where(eq(schema.proxy_bindings.proxy_id, proxyId));

    // Delete proxy
    await db.delete(schema.proxies)
      .where(eq(schema.proxies.id, proxyId));

    res.json({
      success: true,
      message: 'Proxy deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete proxy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete proxy'
    });
  }
});

// POST /api/proxies/:id/health-check - Perform health check on proxy
router.post('/:id/health-check', authenticateToken, async (req, res) => {
  try {
    const proxyId = parseInt(req.params.id);
    
    const proxy = await db.query.proxies.findFirst({
      where: (proxies, { eq }) => eq(proxies.id, proxyId)
    });

    if (!proxy) {
      return res.status(404).json({
        success: false,
        error: 'Proxy not found'
      });
    }

    // In a real implementation, this would perform an actual health check
    // For now, we'll simulate a health check
    const healthCheck = await performProxyHealthCheck(proxy);

    // Update proxy health status
    await db.update(schema.proxies)
      .set({
        health_status: healthCheck.healthy ? 'ok' : 'degraded',
        latency_ms: healthCheck.latency,
        last_used_at: new Date(),
      })
      .where(eq(schema.proxies.id, proxyId));

    res.json({
      success: true,
      data: healthCheck
    });
  } catch (error) {
    console.error('Failed to perform health check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform health check'
    });
  }
});

// GET /api/proxies/stats - Get proxy statistics
router.get('/stats', authenticateToken, async (_req, res) => {
  try {
    const proxies = await db.query.proxies.findMany();

    const totalProxies = proxies.length;
    const activeProxies = proxies.filter(p => p.status === PROXY_STATUS.ACTIVE).length;
    const inactiveProxies = proxies.filter(p => p.status === PROXY_STATUS.INACTIVE).length;
    const testingProxies = proxies.filter(p => p.status === PROXY_STATUS.TESTING).length;

    const healthyProxies = proxies.filter(p => p.health_status === 'ok').length;
    const degradedProxies = proxies.filter(p => p.health_status === 'degraded').length;
    const deadProxies = proxies.filter(p => p.health_status === 'dead').length;

    const assignedProxies = proxies.filter(p => p.assigned_account_id).length;
    const availableProxies = proxies.filter(p => !p.assigned_account_id && p.status === PROXY_STATUS.ACTIVE).length;

    // Group by IP type
    const ipTypeStats = proxies.reduce((acc, proxy) => {
      const type = proxy.ip_type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by country
    const countryStats = proxies.reduce((acc, proxy) => {
      const country = proxy.country;
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        total: totalProxies,
        status: {
          active: activeProxies,
          inactive: inactiveProxies,
          testing: testingProxies,
        },
        health: {
          healthy: healthyProxies,
          degraded: degradedProxies,
          dead: deadProxies,
        },
        assignment: {
          assigned: assignedProxies,
          available: availableProxies,
        },
        by_ip_type: ipTypeStats,
        by_country: countryStats,
      }
    });
  } catch (error) {
    console.error('Failed to get proxy stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get proxy statistics'
    });
  }
});

// Helper function to perform proxy health check
async function performProxyHealthCheck(proxy: any) {
  // In a real implementation, this would:
  // 1. Test TCP connectivity
  // 2. Test HTTPS connectivity
  // 3. Measure latency
  // 4. Check IP intel
  
  // For now, simulate a health check
  const latency = Math.floor(Math.random() * 200) + 50; // 50-250ms
  const healthy = latency < 200; // Consider healthy if latency < 200ms
  
  return {
    healthy,
    latency,
    timestamp: new Date().toISOString(),
    details: {
      tcp_connect: healthy,
      https_connect: healthy,
      ip_intel: {
        country: proxy.country,
        city: proxy.city,
        asn: proxy.asn,
        ip_type: proxy.ip_type,
      }
    }
  };
}

export default router;
