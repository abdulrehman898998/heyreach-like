import express from 'express';
import { z } from 'zod';
import { storage } from '../storage';

const router = express.Router();

// Schema for lead data from external API
const LeadDataSchema = z.object({
  profileUrl: z.string().url(),
  name: z.string().optional(),
  customFields: z.record(z.string()).optional(),
  message: z.string().optional(),
});

const CampaignLeadRequestSchema = z.object({
  campaignId: z.number(),
  leads: z.array(LeadDataSchema),
  apiKey: z.string().optional(), // For future authentication
});

// POST /api/external/campaigns/:campaignId/leads
// Send leads to a specific campaign via HTTP request
router.post('/campaigns/:campaignId/leads', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId);
    
    // Validate request body
    const validationResult = CampaignLeadRequestSchema.safeParse({
      campaignId,
      leads: req.body.leads || [req.body], // Support both array and single lead
      apiKey: req.headers['x-api-key'] || req.body.apiKey,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors,
      });
    }

    const { leads } = validationResult.data;

    // Check if campaign exists
    const campaign = await storage.campaigns.getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    // Check if campaign is active
    if (campaign.status !== 'active' && campaign.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Campaign is not active',
        campaignStatus: campaign.status,
      });
    }

    // Create a temporary lead file for these leads
    const leadFile = await storage.leadFiles.createLeadFile({
      name: `API Import - ${new Date().toISOString()}`,
      originalName: `api-import-${Date.now()}.json`,
      columnNames: ['profileUrl', 'name', 'message', ...Object.keys(leads[0]?.customFields || {})],
      selectedColumns: ['profileUrl', 'name', 'message'],
      rowCount: leads.length,
    });

    // Create leads in the database
    const createdLeads = [];
    for (const leadData of leads) {
      const lead = await storage.leads.createLead({
        leadFileId: leadFile.id,
        profileUrl: leadData.profileUrl,
        name: leadData.name || '',
        customFields: leadData.customFields || {},
      });
      createdLeads.push(lead);
    }

    // Update campaign with new leads
    const updatedCampaign = await storage.campaigns.updateCampaign(campaignId, {
      totalLeads: campaign.totalLeads + leads.length,
      messagesPending: campaign.messagesPending + leads.length,
    });

    // Create campaign executions for each lead
    const executions = [];
    for (const lead of createdLeads) {
      const message = leadData.message || campaign.messageTemplate || 'Hello!';
      
      const execution = await storage.campaignExecutions.createCampaignExecution({
        campaignId,
        leadId: lead.id,
        accountId: 1, // Default account, will be assigned during execution
        profileUrl: lead.profileUrl,
        message,
        status: 'pending',
      });
      executions.push(execution);
    }

    res.json({
      success: true,
      message: `Successfully added ${leads.length} leads to campaign`,
      data: {
        campaignId,
        leadsAdded: leads.length,
        leadFileId: leadFile.id,
        executionsCreated: executions.length,
        campaignStatus: updatedCampaign.status,
      },
    });

  } catch (error) {
    console.error('Error adding leads to campaign via API:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add leads to campaign',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/external/campaigns/:campaignId/status
// Get campaign status and statistics
router.get('/campaigns/:campaignId/status', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId);
    
    const campaign = await storage.campaigns.getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    const stats = await storage.campaignExecutions.getExecutionStats(campaignId);
    
    res.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          totalLeads: campaign.totalLeads,
          messagesSent: campaign.messagesSent,
          messagesFailed: campaign.messagesFailed,
          messagesPending: campaign.messagesPending,
        },
        stats: {
          total: stats.total,
          success: stats.success,
          failed: stats.failed,
          pending: stats.pending,
          successRate: stats.successRate,
        },
      },
    });

  } catch (error) {
    console.error('Error getting campaign status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get campaign status',
    });
  }
});

// POST /api/external/campaigns/:campaignId/start
// Start a campaign via API
router.post('/campaigns/:campaignId/start', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId);
    
    const campaign = await storage.campaigns.getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    if (campaign.status === 'active') {
      return res.status(400).json({
        success: false,
        error: 'Campaign is already active',
      });
    }

    // Update campaign status to active
    const updatedCampaign = await storage.campaigns.updateCampaign(campaignId, {
      status: 'active',
    });

    res.json({
      success: true,
      message: 'Campaign started successfully',
      data: {
        campaignId,
        status: updatedCampaign.status,
      },
    });

  } catch (error) {
    console.error('Error starting campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start campaign',
    });
  }
});

// POST /api/external/campaigns/:campaignId/stop
// Stop a campaign via API
router.post('/campaigns/:campaignId/stop', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId);
    
    const campaign = await storage.campaigns.getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    if (campaign.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Campaign is not active',
      });
    }

    // Update campaign status to paused
    const updatedCampaign = await storage.campaigns.updateCampaign(campaignId, {
      status: 'paused',
    });

    res.json({
      success: true,
      message: 'Campaign stopped successfully',
      data: {
        campaignId,
        status: updatedCampaign.status,
      },
    });

  } catch (error) {
    console.error('Error stopping campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop campaign',
    });
  }
});

// GET /api/external/campaigns
// List all campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await storage.campaigns.getAllCampaigns();
    
    res.json({
      success: true,
      data: campaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        totalLeads: campaign.totalLeads,
        messagesSent: campaign.messagesSent,
        messagesFailed: campaign.messagesFailed,
        messagesPending: campaign.messagesPending,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      })),
    });

  } catch (error) {
    console.error('Error listing campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list campaigns',
    });
  }
});

export default router;
