import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { sql } from 'drizzle-orm';
import { createRateLimiter } from './lib/rateLimit';
import { authenticateToken } from './lib/auth';
import env from './env';

// Import routes
import authRouter from './routes/auth';
import accountsRouter from './routes/accounts';
import campaignsRouter from './routes/campaigns';
import leadsRouter from './routes/leads';
import notificationsRouter from './routes/notifications';
import proxiesRouter from './routes/proxies';

const app: express.Application = express();
const PORT = env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID'],
}));

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`🌐 ${req.method} ${req.path} - Origin: ${req.headers.origin} - User-Agent: ${req.headers['user-agent']?.substring(0, 50)}...`);
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(createRateLimiter());

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    // Check database connection
    const { db } = await import('./lib/drizzle');
    await db.execute(sql`SELECT 1`);
    
    // Check Redis connection
    const { checkRedisHealth } = await import('./lib/redis');
    const redisHealthy = await checkRedisHealth();
    
    // Check S3 connection
    const { checkS3Health } = await import('./lib/s3');
    const s3Healthy = await checkS3Health();
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'ok',
        redis: redisHealthy ? 'ok' : 'error',
        s3: s3Healthy ? 'ok' : 'error',
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Auth routes (public)
app.use('/api/auth', authRouter);

// API routes (protected)
app.use('/api/accounts', authenticateToken, accountsRouter);
app.use('/api/campaigns', authenticateToken, campaignsRouter);
app.use('/api/leads', authenticateToken, leadsRouter);
app.use('/api/notifications', authenticateToken, notificationsRouter);
app.use('/api/proxies', authenticateToken, proxiesRouter);

// Automation stats endpoint
app.get('/api/automation/stats', authenticateToken, async (req, res) => {
  try {
    const { getAutomationStats } = await import('./services/notifications');
    const stats = await getAutomationStats(req.user!.id);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Failed to get automation stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get automation stats'
    });
  }
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 HeyReach API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base URL: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  // Close database connections
  const { client } = await import('./lib/drizzle');
  await client.end();
  
  // Close Redis connection
  const { redis } = await import('./lib/redis');
  await redis.quit();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  
  // Close database connections
  const { client } = await import('./lib/drizzle');
  await client.end();
  
  // Close Redis connection
  const { redis } = await import('./lib/redis');
  await redis.quit();
  
  process.exit(0);
});

export default app;
