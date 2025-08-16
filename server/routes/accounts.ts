import { Router } from 'express';
import { getDatabase } from '../db.js';
import { accounts, proxies, action_logs } from '../../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { getWarmupQueue } from '../queues/queueManager.js';
import { EnhancedInstagramBot } from '../automation/enhancedInstagramBot.js';

const router = Router();

// Validation schemas
const addAccountSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  twofaSecret: z.string().optional(),
});

const reloginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  twofaSecret: z.string().optional(),
});

// POST /api/accounts - Add account
router.post('/', async (req, res) => {
  try {
    const { username, password, twofaSecret } = addAccountSchema.parse(req.body);
    const db = getDatabase();

    // Check if account already exists
    const existingAccount = await db.select().from(accounts).where(eq(accounts.username, username)).limit(1);

    if (existingAccount.length > 0) {
      return res.status(400).json({ 
        error: 'Account already exists' 
      });
    }

    // Find available proxy
    const availableProxy = await db.select().from(proxies).where(eq(proxies.status, 'available')).limit(1);

    if (!availableProxy || availableProxy.length === 0) {
      return res.status(503).json({ 
        error: 'No available proxies' 
      });
    }

    // Create account
    const [newAccount] = await db.insert(accounts).values({
      user_id: 1, // TODO: Get from auth
      username,
      status: 'warmup',
      assigned_proxy_id: availableProxy[0].id,
      session_label: `acc_${Date.now()}`,
      warmup_started_at: new Date(),
      daily_msg_limit: 50,
    }).returning();

    // Update proxy assignment
    await db.update(proxies)
      .set({
        assigned_account_id: newAccount.id,
        status: 'assigned',
        updated_at: new Date(),
      })
      .where(eq(proxies.id, availableProxy[0].id));

    // Initialize Instagram bot and attempt login
    const bot = new EnhancedInstagramBot({
      headless: process.env.PLAYWRIGHT_HEADLESS === 'true',
      proxy: {
        server: `${availableProxy[0].endpoint_template}?session=${newAccount.session_label}`,
        username: availableProxy[0].username,
        password: availableProxy[0].password,
      },
    });

    const loginResult = await bot.initialize(username, password, twofaSecret);

    if (loginResult.success) {
      // Save cookies
      const cookies = await bot.context?.cookies();
      if (cookies) {
        // TODO: Encrypt cookies before saving
        await db.update(accounts)
          .set({
            cookies_encrypted: JSON.stringify(cookies),
            last_login_at: new Date(),
            updated_at: new Date(),
          })
          .where(eq(accounts.id, newAccount.id));
      }

      // Schedule warmup job
      await getWarmupQueue().add('warmup', {
        accountId: newAccount.id,
        actionType: 'organic',
      }, { delay: 60000 }); // Start after 1 minute

      await bot.close();

      res.json({
        success: true,
        account: {
          id: newAccount.id,
          username: newAccount.username,
          status: newAccount.status,
          warmup_started_at: newAccount.warmup_started_at,
        },
      });
    } else {
      // Login failed, mark account for manual verification
      await db.update(accounts)
        .set({
          status: 'needs_manual_verification',
          updated_at: new Date(),
        })
        .where(eq(accounts.id, newAccount.id));

      await bot.close();

      res.status(400).json({
        success: false,
        error: loginResult.message,
        account: {
          id: newAccount.id,
          username: newAccount.username,
          status: 'needs_manual_verification',
        },
      });
    }

  } catch (error) {
    console.error('Error adding account:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// GET /api/accounts - List accounts
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const accountList = await db.select().from(accounts).orderBy(desc(accounts.created_at));

    // Get last error for each account
    const accountsWithErrors = await Promise.all(
      accountList.map(async (account) => {
        const lastError = await db.select().from(action_logs).where(and(
          eq(action_logs.account_id, account.id),
          eq(action_logs.result, 'failed')
        )).orderBy(desc(action_logs.created_at)).limit(1);

                  return {
            ...account,
            last_error: lastError && lastError.length > 0 ? lastError[0].details?.error || null : null,
          };
      })
    );

    res.json({
      success: true,
      accounts: accountsWithErrors,
    });

  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// POST /api/accounts/:id/relogin - Force relogin
router.post('/:id/relogin', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    const { username, password, twofaSecret } = reloginSchema.parse(req.body);
    const db = getDatabase();

    // Get account and proxy details
    const account = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);

    if (!account || account.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const accountData = account[0];
    const proxy = accountData.assigned_proxy_id ? await db.select().from(proxies).where(eq(proxies.id, accountData.assigned_proxy_id)).limit(1) : null;

    // Initialize Instagram bot
    const bot = new EnhancedInstagramBot({
      headless: process.env.PLAYWRIGHT_HEADLESS === 'true',
      proxy: proxy && proxy.length > 0 ? {
        server: `${proxy[0].endpoint_template}?session=${accountData.session_label}`,
        username: proxy[0].username,
        password: proxy[0].password,
      } : undefined,
    });

    const loginResult = await bot.initialize(username, password, twofaSecret);

    if (loginResult.success) {
      // Save cookies
      const cookies = await bot.context?.cookies();
      if (cookies) {
        // TODO: Encrypt cookies before saving
        await db.update(accounts)
          .set({
            cookies_encrypted: JSON.stringify(cookies),
            last_login_at: new Date(),
            status: accountData.status === 'needs_manual_verification' ? 'warmup' : accountData.status,
            updated_at: new Date(),
          })
          .where(eq(accounts.id, accountId));
      }

      await bot.close();

      res.json({
        success: true,
        message: 'Relogin successful',
      });
    } else {
      await bot.close();

      res.status(400).json({
        success: false,
        error: loginResult.message,
      });
    }

  } catch (error) {
    console.error('Error relogin:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// GET /api/accounts/:id/verify - Start verify now session
router.get('/:id/verify', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    const db = getDatabase();

    const account = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);

    if (!account || account.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const accountData = account[0];
    if (accountData.status !== 'needs_manual_verification') {
      return res.status(400).json({ error: 'Account does not need verification' });
    }

    // TODO: Implement WebSocket session for live browser control
    // For now, return a placeholder response
    res.json({
      success: true,
      verifyUrl: `/verify-session/${accountId}`,
      message: 'Verification session ready',
    });

  } catch (error) {
    console.error('Error starting verification:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

export default router;
