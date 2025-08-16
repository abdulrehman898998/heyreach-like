import { Router } from 'express'
import { z } from 'zod'
import { db, schema } from '../lib/drizzle'
import { authenticateToken, requireOwnership } from '../lib/auth'
import { eq, and } from 'drizzle-orm'

const router = Router()

// Account creation schema
const createAccountSchema = z.object({
  username: z.string().min(1).max(50),
  home_country: z.string().length(2),
  home_city: z.string().min(1).max(100),
  daily_msg_limit: z.number().min(1).max(200).default(50),
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
    
    let whereClause = eq(schema.accounts.user_id, userId)
    if (status && typeof status === 'string') {
      whereClause = and(whereClause, eq(schema.accounts.status, status as any))
    }

    const accounts = await db.query.accounts.findMany({
      where: whereClause,
      with: {
        proxy: true,
      },
      limit: Number(limit),
      offset,
      orderBy: schema.accounts.created_at,
    })

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

    // Find available proxy
    const availableProxy = await db.query.proxies.findFirst({
      where: and(
        eq(schema.proxies.status, 'active'),
        eq(schema.proxies.health_status, 'ok')
      ),
    })

    if (!availableProxy) {
      return res.status(400).json({
        success: false,
        error: 'No available proxies. Please add proxies first.',
      })
    }

    // Create account with warming status
    const [account] = await db.insert(schema.accounts).values({
      user_id: userId,
      username: validatedData.username,
      status: 'warming',
      assigned_proxy_id: availableProxy.id,
      session_label: `session_${Date.now()}`,
      home_country: validatedData.home_country,
      home_city: validatedData.home_city,
      daily_msg_limit: validatedData.daily_msg_limit,
      daily_msg_count: 0,
      risk_score: 0,
      warmup_started_at: new Date(),
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

    // TODO: Queue warmup job
    // await queue.add('account-warmup', { accountId })

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
