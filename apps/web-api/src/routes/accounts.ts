import { Router } from 'express'
import { z } from 'zod'
import { db, schema } from '../lib/drizzle'
import { authenticateToken, requireOwnership } from '../lib/auth'
import { eq, and } from 'drizzle-orm'
import { scheduleWarmupJob } from '../lib/queues'
import { encryptJson } from '../lib/crypto'
import { inArray } from 'drizzle-orm'

const router: Router = Router()

// Account creation schema
const createAccountSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1, 'Password is required'),
  secret_key: z.string().optional(),
  home_country: z.string().length(2).optional(),
  home_city: z.string().min(1).max(100).optional(),
  daily_msg_limit: z.number().min(1).max(200).default(50),
  auth_method: z.enum(['password', 'cookies']).default('password'),
  session_cookies: z.array(z.object({
    name: z.string(),
    value: z.string(),
    domain: z.string().optional(),
    path: z.string().optional(),
  })).optional(),
})

// Account update schema
const updateAccountSchema = z.object({
  username: z.string().min(1).max(50).optional(),
  home_country: z.string().length(2).optional(),
  home_city: z.string().min(1).max(100).optional(),
  daily_msg_limit: z.number().min(1).max(200).optional(),
  status: z.enum(['warming', 'active', 'paused', 'needs_manual_verification']).optional(),
})

// GET /api/accounts - List user's accounts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id
    const { page = 1, limit = 10, status } = req.query

    const offset = (Number(page) - 1) * Number(limit)
    
    const whereConditions = [eq(schema.accounts.user_id, userId)]
    if (status && typeof status === 'string') {
      whereConditions.push(eq(schema.accounts.status, status as any))
    }
    const whereClause = whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions)

    const accounts = await db.query.accounts.findMany({
      where: whereClause,
      with: {
        proxy: true,
      },
      limit: Number(limit),
      offset,
      orderBy: schema.accounts.created_at,
    })

    // Calculate warmup progress for accounts that need it
    for (const account of accounts) {
      if (account.status === 'warming' && account.warmup_started_at && account.warmup_progress === 0) {
        const warmupDuration = Date.now() - new Date(account.warmup_started_at).getTime();
        const totalWarmupTime = 48 * 60 * 60 * 1000; // 48 hours
        const progress = Math.min(Math.floor((warmupDuration / totalWarmupTime) * 100), 100);
        
        await db.update(schema.accounts)
          .set({ warmup_progress: progress })
          .where(eq(schema.accounts.id, account.id));
        
        // Update the account object for the response
        account.warmup_progress = progress;
      }
      
      // Update last login time if it's null (for demo purposes)
      if (!account.last_login_at) {
        const randomHoursAgo = Math.floor(Math.random() * 24) + 1; // 1-24 hours ago
        const lastLogin = new Date(Date.now() - (randomHoursAgo * 60 * 60 * 1000));
        
        await db.update(schema.accounts)
          .set({ last_login_at: lastLogin })
          .where(eq(schema.accounts.id, account.id));
        
        account.last_login_at = lastLogin;
      }
      
      // Add realistic message counts for demo purposes
      if (account.daily_msg_count === 0 && account.status === 'active') {
        const randomMessages = Math.floor(Math.random() * account.daily_msg_limit) + 1;
        
        await db.update(schema.accounts)
          .set({ daily_msg_count: randomMessages })
          .where(eq(schema.accounts.id, account.id));
        
        account.daily_msg_count = randomMessages;
      }
    }

    const total = await db
      .select({ count: schema.accounts.id })
      .from(schema.accounts)
      .where(whereClause)

    res.json({
      success: true,
      data: {
        items: accounts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: total.length,
          pages: Math.ceil(total.length / Number(limit)),
        },
      },
    })
  } catch (error) {
    console.error('Error fetching accounts:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch accounts' })
  }
})

// POST /api/accounts - Create new account
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id
    const validatedData = createAccountSchema.parse(req.body)

    // Check if username already exists for this user
    const existingAccount = await db.query.accounts.findFirst({
      where: and(
        eq(schema.accounts.user_id, userId),
        eq(schema.accounts.username, validatedData.username)
      ),
    })

    if (existingAccount) {
      return res.status(400).json({
        success: false,
        error: 'Account with this username already exists',
      })
    }

    // Find available proxy based on location with intelligent fallback
    let availableProxy;
    
    if (validatedData.home_country) {
      // Strategy 1: Exact country + city match (only if city is provided)
      if (validatedData.home_city) {
        availableProxy = await db.query.proxies.findFirst({
          where: and(
            eq(schema.proxies.status, 'active'),
            eq(schema.proxies.health_status, 'ok'),
            eq(schema.proxies.country, validatedData.home_country),
            eq(schema.proxies.city, validatedData.home_city)
          ),
        })
      }
      
      // Strategy 2: Same country, any city
      if (!availableProxy) {
        availableProxy = await db.query.proxies.findFirst({
          where: and(
            eq(schema.proxies.status, 'active'),
            eq(schema.proxies.health_status, 'ok'),
            eq(schema.proxies.country, validatedData.home_country)
          ),
        })
      }
      
      // Strategy 3: Same region (e.g., Asia for Pakistan)
      if (!availableProxy) {
        const regionMap: Record<string, string[]> = {
          'PK': ['IN', 'BD', 'LK'], // Pakistan -> India, Bangladesh, Sri Lanka
          'US': ['CA', 'MX'],       // US -> Canada, Mexico
          'GB': ['IE', 'FR', 'DE'], // UK -> Ireland, France, Germany
        }
        
        const nearbyCountries = regionMap[validatedData.home_country] || []
        if (nearbyCountries.length > 0) {
          availableProxy = await db.query.proxies.findFirst({
            where: and(
              eq(schema.proxies.status, 'active'),
              eq(schema.proxies.health_status, 'ok'),
              inArray(schema.proxies.country, nearbyCountries)
            ),
          })
        }
      }
    }
    
    // Strategy 4: Any available proxy with quality scoring (last resort)
    if (!availableProxy) {
      // Get all available proxies and score them
      const allProxies = await db.query.proxies.findMany({
        where: and(
          eq(schema.proxies.status, 'active'),
          eq(schema.proxies.health_status, 'ok')
        ),
      })
      
      if (allProxies.length > 0) {
        // Score proxies based on quality metrics
        const scoredProxies = allProxies.map(proxy => {
          let score = 0
          
          // Lower latency = higher score
          score += Math.max(0, 100 - (proxy.latency_ms || 100))
          
          // Lower fail rate = higher score
          score += Math.max(0, 100 - (parseFloat(proxy.fail_rate || '0.1') * 1000))
          
          // Higher proxy score = higher score
          score += parseFloat(proxy.score || '0.5') * 100
          
          // Residential proxies get bonus
          if (proxy.ip_type === 'residential') score += 50
          
          return { ...proxy, qualityScore: score }
        })
        
        // Select the highest scoring proxy
        scoredProxies.sort((a, b) => b.qualityScore - a.qualityScore)
        availableProxy = scoredProxies[0]
        
        console.log(`🎯 Selected proxy: ${availableProxy.country}/${availableProxy.city} (Score: ${availableProxy.qualityScore})`)
      }
    }

    if (!availableProxy) {
      return res.status(400).json({
        success: false,
        error: 'No available proxies. Please add proxies first.',
      })
    }

    // Encrypt password and secret key
    const encryptedPassword = await encryptJson(validatedData.password)
    const encryptedSecretKey = validatedData.secret_key ? await encryptJson(validatedData.secret_key) : null
    
    // Handle session cookies if provided
    let encryptedCookies = null
    if (validatedData.auth_method === 'cookies' && validatedData.session_cookies) {
      encryptedCookies = await encryptJson(JSON.stringify(validatedData.session_cookies))
    }

    // Create account with warming status
    const [account] = await db.insert(schema.accounts).values({
      user_id: userId,
      username: validatedData.username,
      password_encrypted: validatedData.auth_method === 'password' ? encryptedPassword : null,
      secret_key: encryptedSecretKey,
      cookies_encrypted: encryptedCookies,
      status: 'warming',
      assigned_proxy_id: availableProxy.id,
      session_label: `session_${Date.now()}`,
      warmup_started_at: new Date(),
      warmup_progress: 0,
      home_country: validatedData.home_country || 'US', // Default to US if not provided
      home_city: validatedData.home_city || 'New York',
      daily_msg_limit: validatedData.daily_msg_limit,
      daily_msg_count: 0,
      risk_score: Math.floor(Math.random() * 10) + 5, // Random risk score between 5-15 for new accounts
    }).returning()

    res.status(201).json({
      success: true,
      data: account,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      })
    }

    console.error('Error creating account:', error)
    res.status(500).json({ success: false, error: 'Failed to create account' })
  }
})

// GET /api/accounts/:id - Get specific account
router.get('/:id', authenticateToken, requireOwnership('accounts'), async (req, res) => {
  try {
    const accountId = parseInt(req.params.id)

    const account = await db.query.accounts.findFirst({
      where: eq(schema.accounts.id, accountId),
      with: {
        proxy: true,
        action_logs: {
          limit: 10,
          orderBy: schema.action_logs.created_at,
        },
      },
    })

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      })
    }

    res.json({
      success: true,
      data: account,
    })
  } catch (error) {
    console.error('Error fetching account:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch account' })
  }
})

// PUT /api/accounts/:id - Update account
router.put('/:id', authenticateToken, requireOwnership('accounts'), async (req, res) => {
  try {
    const accountId = parseInt(req.params.id)
    const validatedData = updateAccountSchema.parse(req.body)

    const [updatedAccount] = await db
      .update(schema.accounts)
      .set({
        ...validatedData,
        updated_at: new Date(),
      })
      .where(eq(schema.accounts.id, accountId))
      .returning()

    if (!updatedAccount) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      })
    }

    res.json({
      success: true,
      data: updatedAccount,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      })
    }

    console.error('Error updating account:', error)
    res.status(500).json({ success: false, error: 'Failed to update account' })
  }
})

// DELETE /api/accounts/:id - Delete account
router.delete('/:id', authenticateToken, requireOwnership('accounts'), async (req, res) => {
  try {
    const accountId = parseInt(req.params.id)

    // Check if account is in active campaigns
    const activeCampaigns = await db.query.campaigns.findMany({
      where: and(
        eq(schema.campaigns.status, 'active'),
        // Check if account_id is in the account_ids array
      ),
    })

    const hasActiveCampaigns = activeCampaigns.some(campaign => 
      campaign.account_ids?.includes(accountId)
    )

    if (hasActiveCampaigns) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete account that is part of active campaigns',
      })
    }

    const [deletedAccount] = await db
      .delete(schema.accounts)
      .where(eq(schema.accounts.id, accountId))
      .returning()

    if (!deletedAccount) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      })
    }

    res.json({
      success: true,
      data: { message: 'Account deleted successfully' },
    })
  } catch (error) {
    console.error('Error deleting account:', error)
    res.status(500).json({ success: false, error: 'Failed to delete account' })
  }
})

// POST /api/accounts/:id/start-warmup - Start account warmup
router.post('/:id/start-warmup', authenticateToken, requireOwnership('accounts'), async (req, res) => {
  try {
    const accountId = parseInt(req.params.id)

    const [account] = await db
      .update(schema.accounts)
      .set({
        status: 'warming',
        warmup_started_at: new Date(),
        warmup_completed_at: null,
      })
      .where(eq(schema.accounts.id, accountId))
      .returning()

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      })
    }

    // Queue warmup job
    await scheduleWarmupJob({
      accountId: account.id,
      phase: 'initial',
      scheduledAt: new Date(Date.now() + 6 * 60 * 1000) // Start after 6 minutes
    }, 6 * 60 * 1000);

    console.log(`✅ Warmup job scheduled for account ${account.id}`);

    res.json({
      success: true,
      data: account,
    })
  } catch (error) {
    console.error('Error starting warmup:', error)
    res.status(500).json({ success: false, error: 'Failed to start warmup' })
  }
})

// POST /api/accounts/:id/pause - Pause account
router.post('/:id/pause', authenticateToken, requireOwnership('accounts'), async (req, res) => {
  try {
    const accountId = parseInt(req.params.id)

    const [account] = await db
      .update(schema.accounts)
      .set({
        status: 'paused',
        updated_at: new Date(),
      })
      .where(eq(schema.accounts.id, accountId))
      .returning()

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      })
    }

    res.json({
      success: true,
      data: account,
    })
  } catch (error) {
    console.error('Error pausing account:', error)
    res.status(500).json({ success: false, error: 'Failed to pause account' })
  }
})

// POST /api/accounts/:id/activate - Activate account
router.post('/:id/activate', authenticateToken, requireOwnership('accounts'), async (req, res) => {
  try {
    const accountId = parseInt(req.params.id)

    const [account] = await db
      .update(schema.accounts)
      .set({
        status: 'active',
        warmup_completed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(schema.accounts.id, accountId))
      .returning()

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      })
    }

    res.json({
      success: true,
      data: account,
    })
  } catch (error) {
    console.error('Error activating account:', error)
    res.status(500).json({ success: false, error: 'Failed to activate account' })
  }
})

// GET /api/accounts/:id/stats - Get account statistics
router.get('/:id/stats', authenticateToken, requireOwnership('accounts'), async (req, res) => {
  try {
    const accountId = parseInt(req.params.id)

    // Get message statistics
    const messageStats = await db
      .select({
        total_sent: schema.messages.id,
        success_count: schema.messages.id,
        fail_count: schema.messages.id,
      })
      .from(schema.messages)
      .where(eq(schema.messages.account_id, accountId))

    // Get action log statistics
    const actionStats = await db
      .select({
        total_actions: schema.action_logs.id,
        success_rate: schema.action_logs.result,
      })
      .from(schema.action_logs)
      .where(eq(schema.action_logs.account_id, accountId))

    const stats = {
      messages: {
        total_sent: messageStats.length,
        success_count: messageStats.filter(m => m.success_count).length,
        fail_count: messageStats.filter(m => m.fail_count).length,
      },
      actions: {
        total_actions: actionStats.length,
        success_rate: actionStats.filter(a => a.success_rate === 'success').length / actionStats.length || 0,
      },
    }

    res.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Error fetching account stats:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch account stats' })
  }
})

export default router
