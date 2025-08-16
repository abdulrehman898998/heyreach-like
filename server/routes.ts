import express from "express";
import { createServer } from "http";
import { serveStatic } from "./vite";
import accountsRouter from "./routes/accounts.js";
import campaignsRouter from "./routes/campaigns.js";
import leadsRouter from "./routes/leads.js";
import notificationsRouter from "./routes/notifications.js";
import automationRouter from "./routes/automation.js";
import proxiesRouter from "./routes/proxies.js";

export async function registerRoutes(app: express.Application) {
  const server = createServer(app);

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // CORS headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // API Routes
  app.use('/api/accounts', accountsRouter);
  app.use('/api/campaigns', campaignsRouter);
  app.use('/api/leads', leadsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/automation', automationRouter);
  app.use('/api/proxies', proxiesRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // Serve static files
  serveStatic(app as any);

  return server;
}