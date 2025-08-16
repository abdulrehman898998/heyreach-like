import express from 'express';
import { storage } from '../storage';
import { warmupEngine } from '../services/warmupEngine';
import { enhancedAutomationService } from '../services/enhancedAutomationService';
import { proxyService } from '../services/proxyService';
import type { InsertInstagramAccount, InsertProxy } from '@shared/schema';

const router = express.Router();

// ============================================================================
// ACCOUNT MANAGEMENT
// ============================================================================

// Add new Instagram account
router.post('/add', async (req, res) => {
  try {
    const { username, password, twofa } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if account already exists
    const existingAccount = await storage.accounts.getAccountByUsername(username);
    if (existingAccount) {
      return res.status(400).json({ error: 'Account already exists' });
    }

    // Get user's location and assign optimal proxy
    const userIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const optimalProxy = await proxyService.getOptimalProxy('user', userIp);

    // Create account with initial status
    const accountData: InsertInstagramAccount = {
      username,
      password,
      twofa: twofa || '',
      status: 'initial_warmup', // Start with initial warmup status
      healthScore: 0,
      accountAge: 0,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      warmupStartDate: new Date(),
      warmupEndDate: null,
      warmupProgress: 0,
      warmupLastRun: null,
      warmupStatus: 'not_started',
      dailyActions: [],
      dailyMessageLimit: 150,
      dailyMessageCount: 0,
      lastMessageDate: null,
      lastUsed: null,
      lastLoginDate: null,
      lastActivityDate: null,
      restrictions: [],
      assignedProxyId: optimalProxy ? parseInt(optimalProxy.id) : null,
      lastLoginIp: userIp,
      lastHeartbeat: null,
      sessionExpiresAt: null,
      lastHealthCheck: null
    };

    const account = await storage.accounts.createAccount(accountData);

    // Schedule initial warmup for 25-30 minutes later
    setTimeout(async () => {
      try {
        await warmupEngine.startInitialWarmup(account.id);
      } catch (error) {
        console.error('Failed to start initial warmup:', error);
      }
    }, 30 * 60 * 1000); // 30 minutes delay

    res.json({
      success: true,
      account: {
        ...account,
        proxy: optimalProxy
      },
      message: 'Account added successfully. Initial warmup will start in 30 minutes.'
    });

  } catch (error) {
    console.error('Error adding account:', error);
    res.status(500).json({ error: 'Failed to add account' });
  }
});

// Add account with cookies
router.post('/add-with-cookies', async (req, res) => {
  try {
    const { username, cookies, localStorage, deviceFingerprint } = req.body;

    if (!username || !cookies) {
      return res.status(400).json({ error: 'Username and cookies are required' });
    }

    // Check if account already exists
    const existingAccount = await storage.accounts.getAccountByUsername(username);
    if (existingAccount) {
      return res.status(400).json({ error: 'Account already exists' });
    }

    // Get user's location and assign optimal proxy
    const userIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const optimalProxy = await proxyService.getOptimalProxy('user', userIp);

    // Create account
    const accountData: InsertInstagramAccount = {
      username,
      password: '', // No password needed with cookies
      twofa: '',
      status: 'ready', // Ready immediately with cookies
      healthScore: 80, // Higher health score with cookies
      accountAge: 0,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      warmupStartDate: new Date(),
      warmupEndDate: null,
      warmupProgress: 100, // Already warmed up
      warmupLastRun: new Date(),
      warmupStatus: 'completed',
      dailyActions: [],
      dailyMessageLimit: 150,
      dailyMessageCount: 0,
      lastMessageDate: null,
      lastUsed: null,
      lastLoginDate: new Date(),
      lastActivityDate: new Date(),
      restrictions: [],
      assignedProxyId: optimalProxy ? parseInt(optimalProxy.id) : null,
      lastLoginIp: userIp,
      lastHeartbeat: new Date(),
      sessionExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      lastHealthCheck: new Date()
    };

    const account = await storage.accounts.createAccount(accountData);

    // Save session data
    if (cookies && deviceFingerprint) {
      await storage.sessions.createSession({
        accountId: account.id,
        encryptedCookies: Buffer.from(JSON.stringify(cookies)).toString('base64'),
        encryptedLocalStorage: localStorage ? Buffer.from(JSON.stringify(localStorage)).toString('base64') : null,
        deviceFingerprint: deviceFingerprint,
        sessionHash: Buffer.from(JSON.stringify(cookies)).toString('base64').substring(0, 64),
        isValid: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
    }

    res.json({
      success: true,
      account: {
        ...account,
        proxy: optimalProxy
      },
      message: 'Account added successfully with cookies.'
    });

  } catch (error) {
    console.error('Error adding account with cookies:', error);
    res.status(500).json({ error: 'Failed to add account with cookies' });
  }
});

// Get all accounts
router.get('/', async (req, res) => {
  try {
    const accounts = await storage.accounts.getAllAccounts();
    
    // Enrich accounts with proxy and session data
    const enrichedAccounts = await Promise.all(accounts.map(async (account) => {
      const proxy = account.assignedProxyId ? await storage.proxies.getProxyById(account.assignedProxyId) : null;
      const activeSession = await storage.sessions.getActiveSession(account.id);
      const recentJobs = await storage.jobs.getJobsByAccount(account.id, undefined, 5);

      return {
        ...account,
        proxy,
        hasActiveSession: !!activeSession,
        recentJobs
      };
    }));

    res.json({ accounts: enrichedAccounts });

  } catch (error) {
    console.error('❌ Get accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Get account by ID
router.get('/:id', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    const account = await storage.accounts.getAccountById(accountId);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const proxy = account.assignedProxyId ? await storage.proxies.getProxyById(account.assignedProxyId) : null;
    const activeSession = await storage.sessions.getActiveSession(account.id);
    const recentJobs = await storage.jobs.getJobsByAccount(account.id, undefined, 10);

    res.json({
      account: {
        ...account,
        proxy,
        hasActiveSession: !!activeSession,
        recentJobs
      }
    });

  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

// Update account
router.put('/:id', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    const updateData = req.body;

    const updatedAccount = await storage.accounts.updateAccount(accountId, updateData);
    
    if (!updatedAccount) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ success: true, account: updatedAccount });

  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// Delete account
router.delete('/:id', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    const success = await storage.accounts.deleteAccount(accountId);
    
    if (!success) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ success: true, message: 'Account deleted successfully' });

  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ============================================================================
// ACCOUNT ACTIONS
// ============================================================================

// Force re-login for account
router.post('/:id/relogin', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    const account = await storage.accounts.getAccountById(accountId);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Invalidate all sessions
    await storage.sessions.invalidateAllSessions(accountId);

    // Update account status
    await storage.accounts.updateAccount(accountId, {
      status: 'needs_relogin',
      warmupStatus: 'not_started'
    });

    // Schedule initial warmup for 30 minutes later
    setTimeout(async () => {
      try {
        await warmupEngine.startInitialWarmup(accountId);
      } catch (error) {
        console.error('Failed to start initial warmup after relogin:', error);
      }
    }, 30 * 60 * 1000); // 30 minutes delay

    res.json({ 
      success: true, 
      message: 'Re-login initiated. Initial warmup will start in 30 minutes.' 
    });

  } catch (error) {
    console.error('Error initiating re-login:', error);
    res.status(500).json({ error: 'Failed to initiate re-login' });
  }
});

// Start initial warmup
router.post('/:id/initial-warmup', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    const account = await storage.accounts.getAccountById(accountId);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await warmupEngine.startInitialWarmup(accountId);

    res.json({ 
      success: true, 
      message: 'Initial warmup started (30 minutes duration)' 
    });

  } catch (error) {
    console.error('Error starting initial warmup:', error);
    res.status(500).json({ error: 'Failed to start initial warmup' });
  }
});

// Start pre-campaign warmup
router.post('/:id/pre-campaign-warmup', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    const account = await storage.accounts.getAccountById(accountId);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await warmupEngine.startPreCampaignWarmup(accountId);

    res.json({ 
      success: true, 
      message: 'Pre-campaign warmup started (20 minutes duration)' 
    });

  } catch (error) {
    console.error('Error starting pre-campaign warmup:', error);
    res.status(500).json({ error: 'Failed to start pre-campaign warmup' });
  }
});

// Test DM for account
router.post('/:id/test-dm', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    const { targetUsername, message } = req.body;

    if (!targetUsername || !message) {
      return res.status(400).json({ error: 'Target username and message are required' });
    }

    // Create a test DM job
    await storage.jobs.createJob({
      type: 'dm',
      accountId,
      payload: {
        targetUsername,
        message,
        isTest: true
      },
      status: 'queued',
      priority: 10, // High priority for test
      scheduledAt: new Date(),
      maxAttempts: 1
    });

    res.json({ 
      success: true, 
      message: 'Test DM job created and queued' 
    });

  } catch (error) {
    console.error('Error creating test DM:', error);
    res.status(500).json({ error: 'Failed to create test DM' });
  }
});

// ============================================================================
// PROXY MANAGEMENT
// ============================================================================

// Get proxy statistics
router.get('/proxies/stats', async (req, res) => {
  try {
    const stats = await storage.proxies.getProxyStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching proxy stats:', error);
    res.status(500).json({ error: 'Failed to fetch proxy stats' });
  }
});

// Add new proxy
router.post('/proxies', async (req, res) => {
  try {
    const proxyData: InsertProxy = req.body;
    const proxy = await storage.proxies.createProxy(proxyData);
    
    res.json({ success: true, proxy });
  } catch (error) {
    console.error('Error adding proxy:', error);
    res.status(500).json({ error: 'Failed to add proxy' });
  }
});

// Get all proxies
router.get('/proxies', async (req, res) => {
  try {
    const proxies = await storage.proxies.getAllProxies();
    res.json({ proxies });
  } catch (error) {
    console.error('Error fetching proxies:', error);
    res.status(500).json({ error: 'Failed to fetch proxies' });
  }
});

// ============================================================================
// JOB & LOG MANAGEMENT
// ============================================================================

// Get jobs for account
router.get('/:id/jobs', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    const { type, limit = 50 } = req.query;
    
    const jobs = await storage.jobs.getJobsByAccount(accountId, type as string, parseInt(limit as string));
    res.json({ jobs });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get automation statistics
router.get('/automation/stats', async (req, res) => {
  try {
    const stats = await enhancedAutomationService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching automation stats:', error);
    res.status(500).json({ error: 'Failed to fetch automation stats' });
  }
});

// Get logs for account
router.get('/:id/logs', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    const { limit = 100 } = req.query;
    
    const logs = await storage.logs.getLogsByAccount(accountId, parseInt(limit as string));
    res.json({ logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Get system logs
router.get('/logs/system', async (req, res) => {
  try {
    const { level, category, limit = 100 } = req.query;
    
    const logs = await storage.logs.getLogsByFilter(
      level as string, 
      category as string, 
      parseInt(limit as string)
    );
    res.json({ logs });
  } catch (error) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ error: 'Failed to fetch system logs' });
  }
});

export default router;
