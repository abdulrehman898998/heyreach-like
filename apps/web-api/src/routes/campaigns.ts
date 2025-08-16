import { Router } from 'express';
import { z } from 'zod';
import { db, schema } from '../lib/drizzle';
import { authenticateToken } from '../lib/auth';
import { CreateCampaignSchema } from '@heyreach/shared/zod';
import { CAMPAIGN_STATUS, ACCOUNT_STATUS } from '@heyreach/shared/constants';

const router = Router();

// GET /api/campaigns - List user's campaigns
router.get('/', authenticateToken, async (req, res) => {
  try {
    const campaigns = await db.query.campaigns.findMany({
      where: (campaigns, { eq }) => eq(campaigns.user_id, req.user!.id),
      with: {
        leads: {
          columns: {
            id: true,
            status: true,
          }
        },
        messages: {
          columns: {
            id: true,
            status: true,
          }
        }
      },
      orderBy: (campaigns, { desc }) => [desc(campaigns.created_at)]
    });

    // Calculate campaign statistics
    const campaignsWithStats = campaigns.map(campaign => {
      const totalLeads = campaign.leads.length;
      const sentLeads = campaign.leads.filter(lead => lead.status === 'sent').length;
      const failedLeads = campaign.leads.filter(lead => lead.status === 'failed').length;
      const pendingLeads = campaign.leads.filter(lead => lead.status === 'pending').length;

      const totalMessages = campaign.messages.length;
      const sentMessages = campaign.messages.filter(msg => msg.status === 'sent').length;
      const failedMessages = campaign.messages.filter(msg => msg.status === 'failed').length;

      return {
        ...campaign,
        stats: {
          leads: {
            total: totalLeads,
            sent: sentLeads,
            failed: failedLeads,
            pending: pendingLeads,
            success_rate: totalLeads > 0 ? (sentLeads / totalLeads) * 100 : 0
          },
          messages: {
            total: totalMessages,
            sent: sentMessages,
            failed: failedMessages,
            success_rate: totalMessages > 0 ? (sentMessages / totalMessages) * 100 : 0
          }
        }
      };
    });

    res.json({
      success: true,
      data: campaignsWithStats
    });
  } catch (error) {
    console.error('Failed to fetch campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns'
    });
  }
});

// POST /api/campaigns - Create new campaign
router.post('/', authenticateToken, async (req, res) => {
  try {
    const validatedData = CreateCampaignSchema.parse(req.body);

    // Verify user owns all specified accounts
    const userAccounts = await db.query.accounts.findMany({
      where: (accounts, { and, eq, inArray }) => 
        and(
          eq(accounts.user_id, req.user!.id),
          inArray(accounts.id, validatedData.account_ids)
        ),
      columns: {
        id: true,
        status: true,
      }
    });

    if (userAccounts.length !== validatedData.account_ids.length) {
      return res.status(400).json({
        success: false,
        error: 'Some specified accounts do not belong to you'
      });
    }

    // Check if accounts are active or warming
    const inactiveAccounts = userAccounts.filter(account => 
      account.status !== ACCOUNT_STATUS.ACTIVE && account.status !== ACCOUNT_STATUS.WARMING
    );

    if (inactiveAccounts.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Some accounts are not active or warming up'
      });
    }

    // Create campaign
    const [campaign] = await db.insert(schema.campaigns).values({
      user_id: req.user!.id,
      name: validatedData.name,
      template_id: validatedData.template_id,
      account_ids: validatedData.account_ids,
      schedule_json: validatedData.schedule_json,
      daily_limit_per_account: validatedData.daily_limit_per_account || 50,
      status: CAMPAIGN_STATUS.DRAFT,
    }).returning();

    res.status(201).json({
      success: true,
      data: campaign
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Failed to create campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create campaign'
    });
  }
});

// GET /api/campaigns/:id - Get campaign details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    
    const campaign = await db.query.campaigns.findFirst({
      where: (campaigns, { and, eq }) => 
        and(
          eq(campaigns.id, campaignId),
          eq(campaigns.user_id, req.user!.id)
        ),
      with: {
        leads: {
          orderBy: (leads, { desc }) => [desc(leads.created_at)]
        },
        messages: {
          orderBy: (messages, { desc }) => [desc(messages.created_at)],
          limit: 50
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Get account details for the campaign
    const accounts = await db.query.accounts.findMany({
      where: (accounts, { inArray }) => inArray(accounts.id, campaign.account_ids),
      columns: {
        id: true,
        username: true,
        status: true,
        daily_msg_count: true,
        daily_msg_limit: true,
      }
    });

    res.json({
      success: true,
      data: {
        ...campaign,
        accounts
      }
    });
  } catch (error) {
    console.error('Failed to fetch campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign'
    });
  }
});

// POST /api/campaigns/:id/start - Start campaign
router.post('/:id/start', authenticateToken, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    
    const campaign = await db.query.campaigns.findFirst({
      where: (campaigns, { and, eq }) => 
        and(
          eq(campaigns.id, campaignId),
          eq(campaigns.user_id, req.user!.id)
        )
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    if (campaign.status !== CAMPAIGN_STATUS.DRAFT) {
      return res.status(400).json({
        success: false,
        error: 'Campaign can only be started from draft status'
      });
    }

    // Check if campaign has leads
    const leadCount = await db.query.leads.findMany({
      where: (leads, { eq }) => eq(leads.campaign_id, campaignId)
    });

    if (leadCount.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Campaign must have leads before starting'
      });
    }

    // Update campaign status
    await db.update(schema.campaigns)
      .set({ status: CAMPAIGN_STATUS.ACTIVE })
      .where(schema.campaigns.id.eq(campaignId));

    // In a real implementation, this would enqueue DM jobs for all leads
    console.log(`Starting campaign ${campaignId} with ${leadCount.length} leads`);

    res.json({
      success: true,
      message: 'Campaign started successfully'
    });
  } catch (error) {
    console.error('Failed to start campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start campaign'
    });
  }
});

// POST /api/campaigns/:id/pause - Pause campaign
router.post('/:id/pause', authenticateToken, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    
    const campaign = await db.query.campaigns.findFirst({
      where: (campaigns, { and, eq }) => 
        and(
          eq(campaigns.id, campaignId),
          eq(campaigns.user_id, req.user!.id)
        )
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    if (campaign.status !== CAMPAIGN_STATUS.ACTIVE) {
      return res.status(400).json({
        success: false,
        error: 'Campaign must be active to pause'
      });
    }

    // Update campaign status
    await db.update(schema.campaigns)
      .set({ status: CAMPAIGN_STATUS.PAUSED })
      .where(schema.campaigns.id.eq(campaignId));

    res.json({
      success: true,
      message: 'Campaign paused successfully'
    });
  } catch (error) {
    console.error('Failed to pause campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause campaign'
    });
  }
});

// GET /api/campaigns/:id/status - Get campaign status and progress
router.get('/:id/status', authenticateToken, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    
    const campaign = await db.query.campaigns.findFirst({
      where: (campaigns, { and, eq }) => 
        and(
          eq(campaigns.id, campaignId),
          eq(campaigns.user_id, req.user!.id)
        )
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Get campaign statistics
    const leads = await db.query.leads.findMany({
      where: (leads, { eq }) => eq(leads.campaign_id, campaignId)
    });

    const messages = await db.query.messages.findMany({
      where: (messages, { eq }) => eq(messages.campaign_id, campaignId)
    });

    // Calculate progress
    const totalLeads = leads.length;
    const sentLeads = leads.filter(lead => lead.status === 'sent').length;
    const failedLeads = leads.filter(lead => lead.status === 'failed').length;
    const pendingLeads = leads.filter(lead => lead.status === 'pending').length;

    const totalMessages = messages.length;
    const sentMessages = messages.filter(msg => msg.status === 'sent').length;
    const failedMessages = messages.filter(msg => msg.status === 'failed').length;
    const pendingMessages = messages.filter(msg => msg.status === 'pending').length;

    // Get account statuses
    const accounts = await db.query.accounts.findMany({
      where: (accounts, { inArray }) => inArray(accounts.id, campaign.account_ids),
      columns: {
        id: true,
        username: true,
        status: true,
        daily_msg_count: true,
        daily_msg_limit: true,
      }
    });

    const activeAccounts = accounts.filter(acc => acc.status === ACCOUNT_STATUS.ACTIVE).length;
    const warmingAccounts = accounts.filter(acc => acc.status === ACCOUNT_STATUS.WARMING).length;
    const pausedAccounts = accounts.filter(acc => acc.status === ACCOUNT_STATUS.PAUSED).length;

    res.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          created_at: campaign.created_at,
        },
        progress: {
          leads: {
            total: totalLeads,
            sent: sentLeads,
            failed: failedLeads,
            pending: pendingLeads,
            success_rate: totalLeads > 0 ? (sentLeads / totalLeads) * 100 : 0
          },
          messages: {
            total: totalMessages,
            sent: sentMessages,
            failed: failedMessages,
            pending: pendingMessages,
            success_rate: totalMessages > 0 ? (sentMessages / totalMessages) * 100 : 0
          }
        },
        accounts: {
          total: accounts.length,
          active: activeAccounts,
          warming: warmingAccounts,
          paused: pausedAccounts,
          details: accounts
        }
      }
    });
  } catch (error) {
    console.error('Failed to get campaign status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get campaign status'
    });
  }
});

// DELETE /api/campaigns/:id - Delete campaign
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    
    const campaign = await db.query.campaigns.findFirst({
      where: (campaigns, { and, eq }) => 
        and(
          eq(campaigns.id, campaignId),
          eq(campaigns.user_id, req.user!.id)
        )
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    if (campaign.status === CAMPAIGN_STATUS.ACTIVE) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete active campaign. Pause it first.'
      });
    }

    // Delete related messages first
    await db.delete(schema.messages)
      .where(schema.messages.campaign_id.eq(campaignId));

    // Delete related leads
    await db.delete(schema.leads)
      .where(schema.leads.campaign_id.eq(campaignId));

    // Delete campaign
    await db.delete(schema.campaigns)
      .where(schema.campaigns.id.eq(campaignId));

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete campaign'
    });
  }
});

export default router;
