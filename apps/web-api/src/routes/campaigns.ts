import { Router } from 'express'
import { z } from 'zod'
import { db, schema } from '../lib/drizzle'
import { authenticateToken, requireOwnership } from '../lib/auth'
import { eq, and, inArray } from 'drizzle-orm'
import { scheduleDMSendJob } from '../lib/queues'

const router: Router = Router()

// Campaign creation schema
const createCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  account_ids: z.array(z.number()).min(1),
  lead_ids: z.array(z.number()).min(1), // Add lead selection
  message_template: z.string().min(1).max(1000), // Add message template
  profile_url_column: z.string().min(1), // Column name for profile URLs
  daily_limit_per_account: z.number().min(1).max(200).default(30),
  schedule_json: z.object({
    enabled: z.boolean().default(true),
    timezone: z.string().default('America/New_York'),
    start_time: z.string().default('09:00'),
    end_time: z.string().default('17:00'),
    days_of_week: z.array(z.number()).default([1, 2, 3, 4, 5]),
  }).optional(),
})

// Instagram URL validation schema
const validateUrlsSchema = z.object({
  urls: z.array(z.string()).min(1),
})

// Campaign update schema
const updateCampaignSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  account_ids: z.array(z.number()).optional(),
  daily_limit_per_account: z.number().min(1).max(200).optional(),
  schedule_json: z.object({
    enabled: z.boolean(),
    timezone: z.string(),
    start_time: z.string(),
    end_time: z.string(),
    days_of_week: z.array(z.number()),
  }).optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
})

// GET /api/campaigns - List user's campaigns
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id
    const { page = 1, limit = 10, status } = req.query

    const offset = (Number(page) - 1) * Number(limit)
    
    const whereConditions = [eq(schema.campaigns.user_id, userId)]
    if (status && typeof status === 'string') {
      whereConditions.push(eq(schema.campaigns.status, status as 'draft' | 'active' | 'paused' | 'completed'))
    }
    const whereClause = whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions)

    const campaigns = await db.query.campaigns.findMany({
      where: whereClause,
      limit: Number(limit),
      offset,
      orderBy: schema.campaigns.created_at,
    })

    const total = await db
      .select({ count: schema.campaigns.id })
      .from(schema.campaigns)
      .where(whereClause)

    res.json({
      success: true,
      data: {
        items: campaigns,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: total.length,
          pages: Math.ceil(total.length / Number(limit)),
        },
      },
    })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch campaigns' })
  }
})

// POST /api/campaigns - Create new campaign
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id
    const validatedData = createCampaignSchema.parse(req.body)

    // Verify account ownership
    const accounts = await db.query.accounts.findMany({
      where: and(
        eq(schema.accounts.user_id, userId),
        inArray(schema.accounts.id, validatedData.account_ids)
      ),
    })

    if (accounts.length !== validatedData.account_ids.length) {
      return res.status(400).json({
        success: false,
        error: 'Some accounts do not exist or do not belong to you',
      })
    }

    // Verify lead ownership
    const leads = await db.query.leads.findMany({
      where: and(
        eq(schema.leads.user_id, userId),
        inArray(schema.leads.id, validatedData.lead_ids)
      ),
    })

    if (leads.length !== validatedData.lead_ids.length) {
      return res.status(400).json({
        success: false,
        error: 'Some leads do not exist or do not belong to you',
      })
    }

    // Check if accounts are active
    const inactiveAccounts = accounts.filter(acc => acc.status !== 'active')
    if (inactiveAccounts.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'All accounts must be active to create a campaign',
        details: inactiveAccounts.map(acc => acc.username),
      })
    }

    const [campaign] = await db.insert(schema.campaigns).values({
      user_id: userId,
      name: validatedData.name,
      account_ids: validatedData.account_ids,
      daily_limit_per_account: validatedData.daily_limit_per_account,
      schedule_json: {
        ...validatedData.schedule_json || {
          enabled: true,
          timezone: 'America/New_York',
          start_time: '09:00',
          end_time: '17:00',
          days_of_week: [1, 2, 3, 4, 5],
        },
        message_template: validatedData.message_template, // Store template in schedule
      },
      status: 'draft',
    }).returning()

    // Assign leads to campaign
    await db.update(schema.leads)
      .set({ campaign_id: campaign.id })
      .where(
        and(
          eq(schema.leads.user_id, userId),
          inArray(schema.leads.id, validatedData.lead_ids)
        )
      )

    res.status(201).json({
      success: true,
      data: campaign,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      })
    }

    console.error('Error creating campaign:', error)
    res.status(500).json({ success: false, error: 'Failed to create campaign' })
  }
})

// GET /api/campaigns/:id - Get specific campaign
router.get('/:id', authenticateToken, requireOwnership('campaigns'), async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id)

    const campaign = await db.query.campaigns.findFirst({
      where: eq(schema.campaigns.id, campaignId),
      with: {
        leads: {
          limit: 50,
          orderBy: schema.leads.created_at,
        },
      },
    })

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      })
    }

    res.json({
      success: true,
      data: campaign,
    })
  } catch (error) {
    console.error('Error fetching campaign:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch campaign' })
  }
})

// PUT /api/campaigns/:id - Update campaign
router.put('/:id', authenticateToken, requireOwnership('campaigns'), async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id)
    const validatedData = updateCampaignSchema.parse(req.body)

    // If updating account_ids, verify ownership
    if (validatedData.account_ids) {
      const accounts = await db.query.accounts.findMany({
        where: and(
          eq(schema.accounts.user_id, req.user!.id),
          inArray(schema.accounts.id, validatedData.account_ids)
        ),
      })

      if (accounts.length !== validatedData.account_ids.length) {
        return res.status(400).json({
          success: false,
          error: 'Some accounts do not exist or do not belong to you',
        })
      }
    }

    const [updatedCampaign] = await db
      .update(schema.campaigns)
      .set({
        ...validatedData,
      })
      .where(eq(schema.campaigns.id, campaignId))
      .returning()

    if (!updatedCampaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      })
    }

    res.json({
      success: true,
      data: updatedCampaign,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      })
    }

    console.error('Error updating campaign:', error)
    res.status(500).json({ success: false, error: 'Failed to update campaign' })
  }
})

// DELETE /api/campaigns/:id - Delete campaign
router.delete('/:id', authenticateToken, requireOwnership('campaigns'), async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id)

    // Check if campaign is active
    const campaign = await db.query.campaigns.findFirst({
      where: eq(schema.campaigns.id, campaignId),
    })

    if (campaign?.status === 'active') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete active campaign. Pause it first.',
      })
    }

    const [deletedCampaign] = await db
      .delete(schema.campaigns)
      .where(eq(schema.campaigns.id, campaignId))
      .returning()

    if (!deletedCampaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      })
    }

    res.json({
      success: true,
      data: { message: 'Campaign deleted successfully' },
    })
  } catch (error) {
    console.error('Error deleting campaign:', error)
    res.status(500).json({ success: false, error: 'Failed to delete campaign' })
  }
})

// GET /api/campaigns/:id/preview - Preview campaign before starting
router.get('/:id/preview', authenticateToken, requireOwnership('campaigns'), async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id)

    const campaign = await db.query.campaigns.findFirst({
      where: eq(schema.campaigns.id, campaignId),
      with: {
        leads: {
          limit: 50,
          orderBy: schema.leads.created_at,
        },
      },
    })

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      })
    }

    // Get accounts for this campaign
    const accounts = await db.query.accounts.findMany({
      where: inArray(schema.accounts.id, campaign.account_ids),
      with: {
        proxy: true,
      },
    })

    // Get campaign leads
    const leads = await db.query.leads.findMany({
      where: eq(schema.leads.campaign_id, campaignId),
      orderBy: schema.leads.created_at,
    })

    // Extract message template from schedule_json
    const scheduleData = campaign.schedule_json as any
    const messageTemplate = scheduleData?.message_template || 'No message template set'
    
    // Generate preview of personalized messages
    const messagePreview = leads.slice(0, 3).map(lead => ({
      lead_id: lead.id,
      profile_url: lead.profile_url,
      first_name: lead.first_name,
      personalized_message: messageTemplate
        .replace(/\{first_name\}/g, lead.first_name || 'there')
        .replace(/\{profile_url\}/g, lead.profile_url)
        .replace(/\{company\}/g, (lead.custom_fields as any)?.company || 'your company')
        .replace(/\{industry\}/g, (lead.custom_fields as any)?.industry || 'your industry')
    }))

    res.json({
      success: true,
      data: {
        campaign,
        accounts: accounts.map(acc => ({
          id: acc.id,
          username: acc.username,
          status: acc.status,
          proxy_country: acc.proxy?.country,
          daily_msg_limit: acc.daily_msg_limit,
        })),
        leads_count: leads.length,
        message_template: messageTemplate,
        message_preview: messagePreview,
        estimated_completion: {
          days: Math.ceil(leads.length / (accounts.length * (campaign.daily_limit_per_account || 30))),
          total_messages: leads.length,
        },
      },
    })
  } catch (error) {
    console.error('Error generating campaign preview:', error)
    res.status(500).json({ success: false, error: 'Failed to generate campaign preview' })
  }
})

// POST /api/campaigns/:id/start - Start campaign
router.post('/:id/start', authenticateToken, requireOwnership('campaigns'), async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id)

    // Get campaign with related accounts
    const campaign = await db.query.campaigns.findFirst({
      where: eq(schema.campaigns.id, campaignId),
    })

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      })
    }

    // Get accounts for this campaign
    const accounts = await db.query.accounts.findMany({
      where: inArray(schema.accounts.id, campaign.account_ids),
    })

    if (campaign.status === 'active') {
      return res.status(400).json({
        success: false,
        error: 'Campaign is already active',
      })
    }

    // Check if accounts are active
    const inactiveAccounts = accounts.filter(acc => acc.status !== 'active')
    if (inactiveAccounts.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'All accounts must be active to start a campaign',
        details: inactiveAccounts.map(acc => acc.username),
      })
    }

    // Check if campaign has leads
    const leadCount = await db
      .select({ count: schema.leads.id })
      .from(schema.leads)
      .where(eq(schema.leads.campaign_id, campaignId))

    if (leadCount.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Campaign must have leads to start',
      })
    }

    const [updatedCampaign] = await db
      .update(schema.campaigns)
      .set({
        status: 'active',
      })
      .where(eq(schema.campaigns.id, campaignId))
      .returning()

    // Queue DM jobs for all leads in campaign
    const campaignLeads = await db.query.leads.findMany({
      where: eq(schema.leads.campaign_id, campaignId),
    });

    // Schedule DM jobs with spacing
    for (let i = 0; i < campaignLeads.length; i++) {
      const lead = campaignLeads[i];
      const delay = i * 10 * 60 * 1000; // 10 minutes between each DM
      
      // Get message template from campaign
      const scheduleData = campaign.schedule_json as any;
      const messageTemplate = scheduleData?.message_template || 'Hello!';
      
      // Personalize message
      const personalizedMessage = messageTemplate
        .replace(/\{first_name\}/g, lead.first_name || 'there')
        .replace(/\{profile_url\}/g, lead.profile_url)
        .replace(/\{company\}/g, (lead.custom_fields as any)?.company || 'your company')
        .replace(/\{industry\}/g, (lead.custom_fields as any)?.industry || 'your industry')
        .replace(/\{message\}/g, (lead.custom_fields as any)?.message || '');
      
      await scheduleDMSendJob({
        accountId: accounts[0].id, // Use first account for now
        leadId: lead.id,
        campaignId: campaignId,
        messageBody: personalizedMessage,
        profileUrl: lead.profile_url,
      }, delay);
    }

    console.log(`✅ Scheduled ${campaignLeads.length} DM jobs for campaign ${campaignId}`);

    res.json({
      success: true,
      data: updatedCampaign,
    })
  } catch (error) {
    console.error('Error starting campaign:', error)
    res.status(500).json({ success: false, error: 'Failed to start campaign' })
  }
})

// POST /api/campaigns/:id/pause - Pause campaign
router.post('/:id/pause', authenticateToken, requireOwnership('campaigns'), async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id)

    const [updatedCampaign] = await db
      .update(schema.campaigns)
      .set({
        status: 'paused',
      })
      .where(eq(schema.campaigns.id, campaignId))
      .returning()

    if (!updatedCampaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      })
    }

    // TODO: Implement campaign pause job queue
    console.log(`Campaign ${campaignId} paused - DM jobs should be cancelled`);

    res.json({
      success: true,
      data: updatedCampaign,
    })
  } catch (error) {
    console.error('Error pausing campaign:', error)
    res.status(500).json({ success: false, error: 'Failed to pause campaign' })
  }
})

// GET /api/campaigns/:id/stats - Get campaign statistics
router.get('/:id/stats', authenticateToken, requireOwnership('campaigns'), async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id)

    // Get lead statistics
    const leadStats = await db
      .select({
        total: schema.leads.id,
        pending: schema.leads.status,
        sent: schema.leads.status,
        failed: schema.leads.status,
        blocked: schema.leads.status,
      })
      .from(schema.leads)
      .where(eq(schema.leads.campaign_id, campaignId))

    const total = leadStats.length
    const pending = leadStats.filter(s => s.pending === 'pending').length
    const sent = leadStats.filter(s => s.sent === 'sent').length
    const failed = leadStats.filter(s => s.failed === 'failed').length
    const blocked = leadStats.filter(s => s.blocked === 'blocked').length

    // Get message statistics
    const messageStats = await db
      .select({
        total_messages: schema.messages.id,
        success_messages: schema.messages.status,
        failed_messages: schema.messages.status,
      })
      .from(schema.messages)
      .where(eq(schema.messages.campaign_id, campaignId))

    const totalMessages = messageStats.length
    const successMessages = messageStats.filter(m => m.success_messages === 'sent').length
    const failedMessages = messageStats.filter(m => m.failed_messages === 'failed').length

    const stats = {
      leads: {
        total,
        pending,
        sent,
        failed,
        blocked,
        success_rate: total > 0 ? (sent / total) * 100 : 0,
      },
      messages: {
        total: totalMessages,
        sent: successMessages,
        failed: failedMessages,
        success_rate: totalMessages > 0 ? (successMessages / totalMessages) * 100 : 0,
      },
    }

    res.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Error fetching campaign stats:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch campaign stats' })
  }
})

// POST /api/campaigns/validate-urls - Validate Instagram URLs
router.post('/validate-urls', authenticateToken, async (req, res) => {
  try {
    const validatedData = validateUrlsSchema.parse(req.body)
    
    const validationResults = validatedData.urls.map(url => {
      const isValid = url.includes('instagram.com') && 
                     (url.includes('/p/') || url.includes('/reel/') || url.includes('/stories/') || 
                      url.match(/instagram\.com\/[^\/\?]+$/))
      
      return {
        url,
        isValid,
        error: isValid ? null : 'Not a valid Instagram URL'
      }
    })
    
    const validUrls = validationResults.filter(r => r.isValid).map(r => r.url)
    const invalidUrls = validationResults.filter(r => !r.isValid)
    
    res.json({
      success: true,
      data: {
        valid: validUrls,
        invalid: invalidUrls,
        total: validatedData.urls.length,
        validCount: validUrls.length,
        invalidCount: invalidUrls.length
      }
    })
  } catch (error) {
    console.error('Error validating URLs:', error)
    res.status(500).json({ success: false, error: 'Failed to validate URLs' })
  }
})

export default router
