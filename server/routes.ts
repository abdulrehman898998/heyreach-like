import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { automationService } from "./services/automationService";
import { googleSheetsService } from "./services/googleSheetsService";
import { BrowserSetup } from "./utils/browserSetup";
import { handleInstagramWebhook, verifyInstagramWebhook } from "./routes/webhooks";
import { instagramOAuthService } from "./services/instagramOAuthService";
import {
  insertSocialAccountSchema,
  insertGoogleSheetSchema,
  insertCampaignSchema,
  insertProxySchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Instagram webhook routes (must be before auth middleware)
  app.get('/api/webhooks/instagram', verifyInstagramWebhook);
  app.post('/api/webhooks/instagram', handleInstagramWebhook);

  // Auth middleware
  await setupAuth(app);

  // WebSocket for real-time updates
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active WebSocket connections by user ID
  const activeConnections = new Map<string, WebSocket[]>();

  wss.on('connection', (ws, req) => {
    // Extract user ID from session (simplified)
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'auth' && data.userId) {
          if (!activeConnections.has(data.userId)) {
            activeConnections.set(data.userId, []);
          }
          activeConnections.get(data.userId)!.push(ws);
          
          ws.on('close', () => {
            const connections = activeConnections.get(data.userId) || [];
            const index = connections.indexOf(ws);
            if (index > -1) {
              connections.splice(index, 1);
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
  });

  // Function to broadcast to user's connections
  const broadcastToUser = (userId: string, data: any) => {
    const connections = activeConnections.get(userId) || [];
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    });
  };

  // Set up automation service with WebSocket broadcast
  automationService.setBroadcastFunction(broadcastToUser);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // System status routes
  app.get('/api/system/browser-status', isAuthenticated, async (req, res) => {
    try {
      const status = await BrowserSetup.checkBrowserAvailability();
      res.json({
        ...status,
        isInstalling: BrowserSetup.isCurrentlyInstalling()
      });
    } catch (error) {
      console.error("Error checking browser status:", error);
      res.status(500).json({ message: "Failed to check browser status" });
    }
  });

  app.post('/api/system/install-browser', isAuthenticated, async (req, res) => {
    try {
      if (BrowserSetup.isCurrentlyInstalling()) {
        return res.json({ message: "Installation already in progress" });
      }

      // Start installation in background
      BrowserSetup.installBrowser().then(success => {
        console.log(`Browser installation ${success ? 'completed' : 'failed'}`);
      }).catch(error => {
        console.error('Browser installation error:', error);
      });

      res.json({ message: "Browser installation started" });
    } catch (error) {
      console.error("Error starting browser installation:", error);
      res.status(500).json({ message: "Failed to start browser installation" });
    }
  });

  // Instagram OAuth for webhook subscription
  app.get("/api/auth/instagram/:socialAccountId", isAuthenticated, async (req: any, res) => {
    try {
      const { socialAccountId } = req.params;
      const userId = req.user.claims.sub;
      
      if (!instagramOAuthService.isConfigured()) {
        return res.status(400).json({ 
          error: "Instagram OAuth not configured. Admin needs to add Meta App credentials." 
        });
      }

      const authUrl = instagramOAuthService.getAuthUrl(userId, socialAccountId);
      res.json({ authUrl });
    } catch (error) {
      console.error("Instagram OAuth error:", error);
      res.status(500).json({ error: "Failed to generate Instagram OAuth URL" });
    }
  });

  app.get("/api/auth/instagram/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.status(400).json({ error: "Missing authorization code or state" });
      }

      // Decode state to get user and social account info
      const [userId, socialAccountId] = (state as string).split(':');
      
      // Exchange code for tokens
      const tokenData = await instagramOAuthService.exchangeCodeForTokens(code as string);
      
      // Get Instagram Business accounts
      const instagramAccounts = await instagramOAuthService.getInstagramBusinessAccounts(tokenData.access_token);
      
      if (instagramAccounts.length === 0) {
        return res.status(400).json({ 
          error: "No Instagram Business accounts found. Make sure your Instagram account is set to Business." 
        });
      }

      // Use the first Instagram Business account found
      const instagramAccount = instagramAccounts[0];
      
      // Subscribe to webhooks
      const webhookSubscribed = await instagramOAuthService.subscribeToWebhooks(
        instagramAccount.page_access_token,
        instagramAccount.page_id
      );

      // Update social account with Instagram Business details
      await storage.updateSocialAccount(parseInt(socialAccountId), {
        instagramBusinessId: instagramAccount.id,
        pageAccessToken: instagramAccount.page_access_token,
        businessId: instagramAccount.business_id, // Store Business Manager ID for webhook matching
        webhookConnected: webhookSubscribed,
      });

      // Create a success page that closes the popup and refreshes parent
      const successHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Instagram Connected</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f9ff; }
            .success { color: #059669; font-size: 18px; margin-bottom: 20px; }
            .loading { color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="success">✓ Instagram Connected Successfully!</div>
          <div class="loading">Closing window...</div>
          <script>
            // Notify parent window and close popup
            if (window.opener) {
              window.opener.postMessage({ type: 'instagram_connected', success: true }, '*');
            }
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
        </html>
      `;
      res.send(successHtml);
      
    } catch (error) {
      console.error("Instagram OAuth callback error:", error);
      
      // Create an error page that closes the popup
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Instagram Connection Failed</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #fef2f2; }
            .error { color: #dc2626; font-size: 18px; margin-bottom: 20px; }
            .loading { color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="error">❌ Instagram Connection Failed</div>
          <div class="loading">Closing window...</div>
          <script>
            // Notify parent window and close popup
            if (window.opener) {
              window.opener.postMessage({ type: 'instagram_connected', success: false, error: '${error.message}' }, '*');
            }
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
        </html>
      `;
      res.send(errorHtml);
    }
  });

  // Social accounts routes
  app.get('/api/social-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accounts = await storage.getSocialAccountsByUser(userId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching social accounts:", error);
      res.status(500).json({ message: "Failed to fetch social accounts" });
    }
  });

  app.post('/api/social-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertSocialAccountSchema.parse({
        ...req.body,
        userId,
      });

      // Encrypt password before storing (simplified)
      validatedData.password = Buffer.from(validatedData.password).toString('base64');

      const account = await storage.createSocialAccount(validatedData);
      await storage.createActivityLog({
        userId,
        action: 'social_account_added',
        details: `Added ${account.platform} account: ${account.username}`,
      });

      res.json(account);
    } catch (error) {
      console.error("Error creating social account:", error);
      res.status(400).json({ message: "Failed to create social account" });
    }
  });

  app.delete('/api/social-accounts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accountId = parseInt(req.params.id);
      
      await storage.deleteSocialAccount(accountId);
      await storage.createActivityLog({
        userId,
        action: 'social_account_deleted',
        details: `Deleted social account`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting social account:", error);
      res.status(500).json({ message: "Failed to delete social account" });
    }
  });

  // Google OAuth routes
  app.get("/api/auth/google", isAuthenticated, async (req: any, res) => {
    try {
      console.log('Google auth request from user:', req.user.claims.sub);
      const authUrl = googleSheetsService.getAuthUrl(req.user.claims.sub);
      console.log('Generated auth URL:', authUrl);
      res.json({ authUrl });
    } catch (error) {
      console.error("Error generating Google auth URL:", error);
      res.status(500).json({ error: "Failed to generate auth URL", details: error.message });
    }
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, state: userId } = req.query;
      
      if (!code || !userId) {
        return res.status(400).json({ error: "Missing authorization code or user ID" });
      }

      const tokens = await googleSheetsService.exchangeCodeForTokens(code as string);
      
      // Redirect to frontend with tokens
      const frontendUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}/google-sheets`
        : 'http://localhost:5000/google-sheets';
      res.redirect(`${frontendUrl}?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}`);
    } catch (error) {
      console.error("Error handling Google OAuth callback:", error);
      res.status(500).json({ error: "Failed to authenticate with Google" });
    }
  });

  app.get("/api/google/sheets", isAuthenticated, async (req: any, res) => {
    try {
      const { access_token, refresh_token } = req.query;
      
      if (!access_token || !refresh_token) {
        return res.status(400).json({ error: "Missing access tokens" });
      }

      const sheets = await googleSheetsService.getUserSheets(
        access_token as string, 
        refresh_token as string
      );
      res.json(sheets);
    } catch (error) {
      console.error("Error fetching user sheets:", error);
      res.status(500).json({ error: "Failed to fetch sheets" });
    }
  });

  app.get("/api/google/sheets/:sheetId/metadata", isAuthenticated, async (req: any, res) => {
    try {
      const { sheetId } = req.params;
      const { access_token, refresh_token } = req.query;
      
      if (!access_token || !refresh_token) {
        return res.status(400).json({ error: "Missing access tokens" });
      }

      const metadata = await googleSheetsService.getSheetMetadata(
        sheetId,
        access_token as string,
        refresh_token as string
      );
      res.json(metadata);
    } catch (error) {
      console.error("Error fetching sheet metadata:", error);
      res.status(500).json({ error: "Failed to fetch sheet metadata" });
    }
  });

  // Google Sheets routes
  app.get('/api/google-sheets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sheets = await storage.getGoogleSheetsByUser(userId);
      res.json(sheets);
    } catch (error) {
      console.error("Error fetching Google Sheets:", error);
      res.status(500).json({ message: "Failed to fetch Google Sheets" });
    }
  });

  app.post('/api/google-sheets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertGoogleSheetSchema.parse({
        ...req.body,
        userId,
      });

      // Validate and process the Google Sheets URL
      const sheetData = await googleSheetsService.validateSheet(validatedData.sheetUrl);
      
      console.log('Creating Google Sheet with data:', validatedData);
      
      const sheet = await storage.createGoogleSheet(validatedData);
      await storage.createActivityLog({
        userId,
        action: 'google_sheet_added',
        details: `Added Google Sheet: ${sheet.name}`,
      });

      res.json(sheet);
    } catch (error) {
      console.error("Error creating Google Sheet:", error);
      res.status(400).json({ message: "Failed to create Google Sheet" });
    }
  });

  // Campaigns routes
  app.get('/api/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const campaigns = await storage.getCampaignsByUser(userId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post('/api/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertCampaignSchema.parse({
        ...req.body,
        userId,
      });

      const campaign = await storage.createCampaign(validatedData);
      await storage.createActivityLog({
        userId,
        action: 'campaign_created',
        details: `Created campaign: ${campaign.name}`,
      });

      res.json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(400).json({ message: "Failed to create campaign" });
    }
  });

  app.post('/api/campaigns/:id/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const campaignId = parseInt(req.params.id);
      
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign || campaign.userId !== userId) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Start the automation
      automationService.startCampaign(campaignId, userId);
      
      await storage.updateCampaign(campaignId, {
        status: 'running',
        startedAt: new Date(),
      });

      await storage.createActivityLog({
        userId,
        action: 'campaign_started',
        details: `Started campaign: ${campaign.name}`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error starting campaign:", error);
      res.status(500).json({ message: "Failed to start campaign" });
    }
  });

  app.post('/api/campaigns/:id/pause', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const campaignId = parseInt(req.params.id);
      
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign || campaign.userId !== userId) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      automationService.pauseCampaign(campaignId);
      
      await storage.updateCampaign(campaignId, {
        status: 'paused',
      });

      await storage.createActivityLog({
        userId,
        action: 'campaign_paused',
        details: `Paused campaign: ${campaign.name}`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error pausing campaign:", error);
      res.status(500).json({ message: "Failed to pause campaign" });
    }
  });

  app.delete('/api/campaigns/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const campaignId = parseInt(req.params.id);
      
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign || campaign.userId !== userId) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Stop automation if running
      if (campaign.status === 'running') {
        automationService.pauseCampaign(campaignId);
      }

      await storage.deleteCampaign(campaignId);
      await storage.createActivityLog({
        userId,
        action: 'campaign_deleted',
        details: `Deleted campaign: ${campaign.name}`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get('/api/activity-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getActivityLogsByUser(userId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Proxy routes
  app.get('/api/proxies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const proxies = await storage.getProxiesByUser(userId);
      res.json(proxies);
    } catch (error) {
      console.error("Error fetching proxies:", error);
      res.status(500).json({ message: "Failed to fetch proxies" });
    }
  });

  app.post('/api/proxies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertProxySchema.parse({
        ...req.body,
        userId,
      });

      const proxy = await storage.createProxy(validatedData);
      await storage.createActivityLog({
        userId,
        action: 'proxy_added',
        details: `Added proxy: ${proxy.name} (${proxy.host}:${proxy.port})`,
      });

      res.json(proxy);
    } catch (error) {
      console.error("Error creating proxy:", error);
      res.status(400).json({ message: "Failed to create proxy" });
    }
  });

  app.put('/api/proxies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const proxyId = parseInt(req.params.id);
      
      const validatedData = insertProxySchema.partial().parse(req.body);
      const updatedProxy = await storage.updateProxy(proxyId, validatedData);

      await storage.createActivityLog({
        userId,
        action: 'proxy_updated',
        details: `Updated proxy: ${updatedProxy.name}`,
      });

      res.json(updatedProxy);
    } catch (error) {
      console.error("Error updating proxy:", error);
      res.status(400).json({ message: "Failed to update proxy" });
    }
  });

  app.delete('/api/proxies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const proxyId = parseInt(req.params.id);
      
      await storage.deleteProxy(proxyId);
      await storage.createActivityLog({
        userId,
        action: 'proxy_deleted',
        details: `Deleted proxy (ID: ${proxyId})`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting proxy:", error);
      res.status(500).json({ message: "Failed to delete proxy" });
    }
  });

  // Manual reply recording
  app.post('/api/replies', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertReplySchema.parse(req.body);
      const reply = await storage.createReply(validatedData);

      // Update campaign stats
      const message = await storage.updateMessage(reply.messageId, {
        status: 'replied',
      });

      // Broadcast update to user
      const userId = req.user.claims.sub;
      broadcastToUser(userId, {
        type: 'reply_received',
        data: reply,
      });

      res.json(reply);
    } catch (error) {
      console.error("Error creating reply:", error);
      res.status(400).json({ message: "Failed to create reply" });
    }
  });

  return httpServer;
}
