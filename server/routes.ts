import express, { type Express } from "express";
import http from "http";
import { storage } from "./storage";
import leadsRouter from "./routes/leads";
import templatesRouter from "./routes/templates";
import campaignsRouter from "./routes/campaigns";

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Demo user bootstrap for memory mode
app.post("/api/_dev/bootstrap-user", async (req, res) => {
  try {
    const { email = "demo@example.com", name = "Demo User" } = req.body || {};
    let user = await (storage as any).getUserByEmail?.(email);
    if (!user) {
      user = await (storage as any).createUser({ email, name, password: "" } as any);
    }
    res.json({ success: true, user });
  } catch (e) {
    console.error("Bootstrap user error:", e);
    res.status(500).json({ success: false, error: "Failed to bootstrap user" });
  }
});

// Simple authentication middleware - ALWAYS ALLOW FOR TESTING
const authenticateUser = async (req: any, res: any, next: any) => {
  try {
        // Get user ID from header or create a demo user
    let userId = req.headers['x-user-id'] as string | undefined;
    
    if (!userId) {
      // Create a demo user if none exists
      try {
        const demoUser = await (storage as any).getUserByEmail("demo@example.com");
        if (demoUser) {
          userId = demoUser.id;
        } else {
          const newUser = await (storage as any).createUser({
            email: "demo@example.com",
            name: "Demo User",
            password: ""
          });
          userId = newUser.id;
        }
      } catch (error) {
        console.error("Failed to create/get demo user:", error);
        return res.status(401).json({ error: "Authentication failed" });
      }
    }

    // Set the user ID and continue
    (req as any).userId = userId;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
};

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/leads", authenticateUser, leadsRouter);
app.use("/api/templates", authenticateUser, templatesRouter);
app.use("/api/campaigns", authenticateUser, campaignsRouter);

// Instagram Account Management
app.get("/api/accounts", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const accounts = await (storage as any).getInstagramAccountsByUser(userId);
    
    res.json({
      success: true,
      accounts: accounts.map((account: any) => ({
        id: account.id,
        username: account.username,
        platform: account.platform || 'instagram',
        status: account.isActive ? 'active' : 'inactive',
        healthScore: account.healthScore,
        isActive: account.isActive,
        lastUsed: account.lastUsed,
        createdAt: account.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error getting accounts:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get accounts",
    });
  }
});

app.post("/api/accounts", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username and password are required",
      });
    }

    const account = await (storage as any).createInstagramAccount({
      userId,
      username,
      password,
      platform: 'instagram',
      healthScore: 100,
      isActive: true,
    });
    
    res.json({
      success: true,
      account: {
        id: account.id,
        username: account.username,
        platform: account.platform || 'instagram',
        status: account.isActive ? 'active' : 'inactive',
        healthScore: account.healthScore,
        isActive: account.isActive,
        createdAt: account.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating account:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create account",
    });
  }
});

app.put("/api/accounts/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const accountId = parseInt(req.params.id);
    const updates = req.body;

    // Verify account belongs to user
    const account = await (storage as any).getInstagramAccountById(accountId);
    if (!account || account.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Account not found",
      });
    }

    const updatedAccount = await (storage as any).updateInstagramAccount(accountId, updates);
    
    res.json({
      success: true,
      account: {
        id: updatedAccount.id,
        username: updatedAccount.username,
        healthScore: updatedAccount.healthScore,
        isActive: updatedAccount.isActive,
        lastUsed: updatedAccount.lastUsed,
        updatedAt: updatedAccount.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating account:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update account",
    });
  }
});

app.delete("/api/accounts/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const accountId = parseInt(req.params.id);

    // Verify account belongs to user
    const account = await (storage as any).getInstagramAccountById(accountId);
    if (!account || account.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Account not found",
      });
    }

    // Deactivate account instead of deleting
    await (storage as any).updateInstagramAccount(accountId, { isActive: false });
    
    res.json({
      success: true,
      message: "Account deactivated successfully",
    });
  } catch (error) {
    console.error("Error deactivating account:", error);
    res.status(500).json({
      success: false,
      error: "Failed to deactivate account",
    });
  }
});

// Analytics Statistics
app.get("/api/analytics/stats", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).userId;
    
    // Get user stats
    const accounts = await (storage as any).getInstagramAccountsByUser(userId);
    const leadFiles = await (storage as any).getLeadFilesByUser(userId);
    const templates = await (storage as any).getTemplatesByUser(userId);
    const campaigns = await (storage as any).getCampaignsByUser(userId);
    
    // Calculate statistics
    const stats = {
      totalMessagesSent: campaigns.reduce((sum: number, c: any) => sum + (c.sentCount || 0), 0),
      activeCampaigns: campaigns.filter((c: any) => c.status === "running" || c.status === "scheduled").length,
      totalAccounts: accounts.length,
      totalLeads: leadFiles.reduce((sum: number, file: any) => sum + file.totalRows, 0),
    };
    
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error getting analytics stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get analytics statistics",
    });
  }
});

// Activity Logs
app.get("/api/activity-logs", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).userId;
    
    // For now, return empty array - can be extended later
    const activityLogs: any[] = [];
    
    res.json({
      success: true,
      logs: activityLogs,
    });
  } catch (error) {
    console.error("Error getting activity logs:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get activity logs",
    });
  }
});

// Dashboard Statistics
app.get("/api/dashboard", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).userId;
    
    // Get user stats
    const accounts = await (storage as any).getInstagramAccountsByUser(userId);
    const leadFiles = await (storage as any).getLeadFilesByUser(userId);
    const templates = await (storage as any).getTemplatesByUser(userId);
    const campaigns = await (storage as any).getCampaignsByUser(userId);
    
    // Calculate statistics
    const stats = {
      accounts: {
        total: accounts.length,
        active: accounts.filter((a: any) => a.isActive).length,
        healthy: accounts.filter((a: any) => a.healthScore && a.healthScore >= 50).length,
      },
      leads: {
        total: leadFiles.reduce((sum: number, file: any) => sum + file.totalRows, 0),
        files: leadFiles.length,
      },
      templates: {
        total: templates.length,
        withVariables: templates.filter((t: any) => t.variables && t.variables.length > 0).length,
      },
      campaigns: {
        total: campaigns.length,
        active: campaigns.filter((c: any) => c.status === "running" || c.status === "scheduled").length,
        completed: campaigns.filter((c: any) => c.status === "completed").length,
        totalSent: campaigns.reduce((sum: number, c: any) => sum + (c.sentCount || 0), 0),
      },
    };
    
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get dashboard statistics",
    });
  }
});

// Error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// 404 handler - only for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "API endpoint not found",
  });
});

export default app;

export async function registerRoutes(hostApp: Express) {
  // Mount our app onto the provided Express app
  hostApp.use(app);
  // Create and return an HTTP server for Vite HMR
  const server = http.createServer(hostApp);
  return server;
}
