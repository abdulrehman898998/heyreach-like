import { Router } from 'express';
import { getDatabase } from '../db.js';
import { campaigns, accounts, messages, leads, message_templates } from '../../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { getDmSendQueue } from '../queues/queueManager.js';
import { generateMessage } from '../../shared/schema.js';

const router = Router();

// Validation schemas
const createCampaignSchema = z.object({
  name: z.string().min(1),
  template_id: z.number().optional(),
  account_ids: z.array(z.number()).min(1),
  lead_ids: z.array(z.number()).min(1),
  schedule_json: z.any().optional(),
  daily_limit_per_account: z.number().min(1).max(100).default(50),
});

const startCampaignSchema = z.object({
  campaignId: z.number(),
});

// POST /api/campaigns - Create campaign
router.post('/', async (req, res) => {
  try {
    const { name, template_id, account_ids, lead_ids, schedule_json, daily_limit_per_account } = createCampaignSchema.parse(req.body);
    const db = getDatabase();

    // Validate accounts exist and are active
    const accountList = await db.query.accounts.findMany({
      where: eq(accounts.id, account_ids[0]), // TODO: Use IN operator
    });

    if (accountList.length !== account_ids.length) {
      return res.status(400).json({ error: 'Some accounts not found' });
    }

    const inactiveAccounts = accountList.filter(acc => acc.status !== 'active');
    if (inactiveAccounts.length > 0) {
      return res.status(400).json({ 
        error: 'Some accounts are not active',
        inactiveAccounts: inactiveAccounts.map(acc => ({ id: acc.id, status: acc.status }))
      });
    }

    // Validate template if provided
    if (template_id) {
      const template = await db.query.message_templates.findFirst({
        where: eq(message_templates.id, template_id),
      });

      if (!template) {
        return res.status(400).json({ error: 'Template not found' });
      }
    }

    // Validate leads exist
    const leadList = await db.query.leads.findMany({
      where: eq(leads.id, lead_ids[0]), // TODO: Use IN operator
    });

    if (leadList.length !== lead_ids.length) {
      return res.status(400).json({ error: 'Some leads not found' });
    }

    // Create campaign
    const [newCampaign] = await db.insert(campaigns).values({
      user_id: 1, // TODO: Get from auth
      name,
      template_id,
      account_ids: account_ids,
      schedule_json,
      daily_limit_per_account,
      status: 'draft',
    }).returning();

    // Create messages for each lead-account combination
    const messagesToCreate = [];
    
    for (const leadId of lead_ids) {
      for (const accountId of account_ids) {
        const lead = leadList.find(l => l.id === leadId);
        if (!lead) continue;

        let messageBody = '';
        
        if (template_id) {
          // Use template with variables
          const template = await db.query.message_templates.findFirst({
            where: eq(message_templates.id, template_id),
          });
          
          if (template) {
            messageBody = generateMessage(template.content, {
              name: lead.first_name || 'there',
              profileUrl: lead.profile_url,
              ...lead.custom_fields,
            });
          }
        } else {
          // Use custom message from lead data
          messageBody = lead.custom_fields?.message || 'Hello!';
        }

        messagesToCreate.push({
          campaign_id: newCampaign.id,
          account_id: accountId,
          lead_id: leadId,
          body_resolved: messageBody,
          status: 'pending',
        });
      }
    }

    if (messagesToCreate.length > 0) {
      await db.insert(messages).values(messagesToCreate);
    }

    res.json({
      success: true,
      campaign: {
        id: newCampaign.id,
        name: newCampaign.name,
        status: newCampaign.status,
        message_count: messagesToCreate.length,
      },
    });

  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// POST /api/campaigns/:id/start - Start campaign
router.post('/:id/start', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const db = getDatabase();

    // Get campaign
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'draft') {
      return res.status(400).json({ error: 'Campaign is not in draft status' });
    }

    // Get pending messages
    const pendingMessages = await db.query.messages.findMany({
      where: and(
        eq(messages.campaign_id, campaignId),
        eq(messages.status, 'pending')
      ),
    });

    if (pendingMessages.length === 0) {
      return res.status(400).json({ error: 'No pending messages found' });
    }

    // Update campaign status
    await db.update(campaigns)
      .set({
        status: 'running',
        updated_at: new Date(),
      })
      .where(eq(campaigns.id, campaignId));

    // Queue DM send jobs with delays
    for (let i = 0; i < pendingMessages.length; i++) {
      const message = pendingMessages[i];
      
      // Calculate delay based on position and daily limits
      const baseDelay = i * (Math.random() * 240000 + 180000); // 3-7 minutes between messages
      const accountDelay = Math.floor(i / campaign.daily_limit_per_account) * 24 * 60 * 60 * 1000; // 24 hours per account cycle
      
              await getDmSendQueue().add('dmSend', {
        accountId: message.account_id,
        messageId: message.id,
        leadId: message.lead_id,
        campaignId: message.campaign_id,
      }, { 
        delay: baseDelay + accountDelay,
        jobId: `dm_${message.id}`,
      });
    }

    res.json({
      success: true,
      message: `Campaign started with ${pendingMessages.length} messages queued`,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: 'running',
        message_count: pendingMessages.length,
      },
    });

  } catch (error) {
    console.error('Error starting campaign:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// GET /api/campaigns/:id/status - Get campaign status
router.get('/:id/status', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const db = getDatabase();

    // Get campaign
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get message statistics
    const messageStats = await db.query.messages.findMany({
      where: eq(messages.campaign_id, campaignId),
    });

    const stats = {
      total: messageStats.length,
      pending: messageStats.filter(m => m.status === 'pending').length,
      sent: messageStats.filter(m => m.status === 'sent').length,
      failed: messageStats.filter(m => m.status === 'failed').length,
    };

    // Calculate progress
    const progress = stats.total > 0 ? Math.round((stats.sent + stats.failed) / stats.total * 100) : 0;

    res.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        progress,
        stats,
      },
    });

  } catch (error) {
    console.error('Error getting campaign status:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// GET /api/campaigns - List campaigns
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const campaignList = await db.query.campaigns.findMany({
      orderBy: [desc(campaigns.created_at)],
    });

    // Get statistics for each campaign
    const campaignsWithStats = await Promise.all(
      campaignList.map(async (campaign) => {
        const messages = await db.query.messages.findMany({
          where: eq(messages.campaign_id, campaign.id),
        });

        const stats = {
          total: messages.length,
          pending: messages.filter(m => m.status === 'pending').length,
          sent: messages.filter(m => m.status === 'sent').length,
          failed: messages.filter(m => m.status === 'failed').length,
        };

        return {
          ...campaign,
          stats,
        };
      })
    );

    res.json({
      success: true,
      campaigns: campaignsWithStats,
    });

  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

export default router;
