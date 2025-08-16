import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { parse } from 'csv-parse';
import { db, schema } from '../lib/drizzle';
import { authenticateToken } from '../lib/auth';
import { UploadLeadsSchema } from '@heyreach/shared/zod';

const router = Router();

// Configure multer for CSV uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// GET /api/leads - List user's leads
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { campaign_id, status, limit = 50, offset = 0 } = req.query;
    
    const whereConditions = [];
    whereConditions.push((leads: any, { eq }: any) => eq(leads.user_id, req.user!.id));
    
    if (campaign_id) {
      whereConditions.push((leads: any, { eq }: any) => eq(leads.campaign_id, parseInt(campaign_id as string)));
    }
    
    if (status) {
      whereConditions.push((leads: any, { eq }: any) => eq(leads.status, status));
    }

    const leads = await db.query.leads.findMany({
      where: (leads, { and, eq }) => {
        const conditions = [eq(leads.user_id, req.user!.id)];
        if (campaign_id) conditions.push(eq(leads.campaign_id, parseInt(campaign_id as string)));
        if (status) conditions.push(eq(leads.status, status as string));
        return and(...conditions);
      },
      with: {
        campaign: {
          columns: {
            id: true,
            name: true,
            status: true,
          }
        },
        messages: {
          columns: {
            id: true,
            status: true,
            sent_at: true,
          }
        }
      },
      orderBy: (leads, { desc }) => [desc(leads.created_at)],
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    // Calculate lead statistics
    const leadStats = leads.map(lead => ({
      ...lead,
      message_count: lead.messages.length,
      last_message: lead.messages.length > 0 ? lead.messages[0] : null,
    }));

    res.json({
      success: true,
      data: leadStats
    });
  } catch (error) {
    console.error('Failed to fetch leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leads'
    });
  }
});

// POST /api/leads/upload - Upload CSV leads
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const validatedData = UploadLeadsSchema.parse(req.body);
    const csvContent = req.file.buffer.toString('utf-8');

    // Parse CSV content
    const records: any[] = [];
    const parser = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    for await (const record of parser) {
      records.push(record);
    }

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid records found in CSV'
      });
    }

    if (records.length > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10,000 leads allowed per upload'
      });
    }

    // Validate CSV structure
    const requiredColumns = ['profile_url'];
    const firstRecord = records[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRecord));
    
    if (missingColumns.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required columns: ${missingColumns.join(', ')}`
      });
    }

    // Validate profile URLs
    const invalidUrls = records.filter(record => {
      const url = record.profile_url;
      return !url || !url.includes('instagram.com/');
    });

    if (invalidUrls.length > 0) {
      return res.status(400).json({
        success: false,
        error: `${invalidUrls.length} records have invalid Instagram profile URLs`
      });
    }

    // Check for duplicate profile URLs
    const profileUrls = records.map(r => r.profile_url);
    const duplicateUrls = profileUrls.filter((url, index) => profileUrls.indexOf(url) !== index);
    
    if (duplicateUrls.length > 0) {
      return res.status(400).json({
        success: false,
        error: `${duplicateUrls.length} duplicate profile URLs found`
      });
    }

    // Check for existing leads with same URLs
    const existingLeads = await db.query.leads.findMany({
      where: (leads, { and, eq, inArray }) => 
        and(
          eq(leads.user_id, req.user!.id),
          inArray(leads.profile_url, profileUrls)
        ),
      columns: {
        profile_url: true,
      }
    });

    const existingUrls = existingLeads.map(lead => lead.profile_url);
    const newRecords = records.filter(record => !existingUrls.includes(record.profile_url));

    if (newRecords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'All leads already exist in your database'
      });
    }

    // Insert new leads
    const leadsToInsert = newRecords.map(record => ({
      user_id: req.user!.id,
      campaign_id: validatedData.campaign_id || null,
      profile_url: record.profile_url,
      first_name: record.first_name || null,
      custom_fields: {
        ...record,
        profile_url: undefined, // Remove from custom fields
        first_name: undefined, // Remove from custom fields
      },
      status: 'pending',
    }));

    const insertedLeads = await db.insert(schema.leads).values(leadsToInsert).returning();

    res.json({
      success: true,
      data: {
        total_uploaded: records.length,
        new_leads: insertedLeads.length,
        existing_leads: existingLeads.length,
        leads: insertedLeads
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Failed to upload leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload leads'
    });
  }
});

// GET /api/leads/:id - Get lead details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    
    const lead = await db.query.leads.findFirst({
      where: (leads, { and, eq }) => 
        and(
          eq(leads.id, leadId),
          eq(leads.user_id, req.user!.id)
        ),
      with: {
        campaign: {
          columns: {
            id: true,
            name: true,
            status: true,
          }
        },
        messages: {
          orderBy: (messages, { desc }) => [desc(messages.created_at)]
        }
      }
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('Failed to fetch lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead'
    });
  }
});

// PUT /api/leads/:id - Update lead
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const { first_name, custom_fields, campaign_id } = req.body;
    
    const lead = await db.query.leads.findFirst({
      where: (leads, { and, eq }) => 
        and(
          eq(leads.id, leadId),
          eq(leads.user_id, req.user!.id)
        )
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    // Validate campaign ownership if campaign_id is provided
    if (campaign_id) {
      const campaign = await db.query.campaigns.findFirst({
        where: (campaigns, { and, eq }) => 
          and(
            eq(campaigns.id, campaign_id),
            eq(campaigns.user_id, req.user!.id)
          )
      });

      if (!campaign) {
        return res.status(400).json({
          success: false,
          error: 'Campaign not found or does not belong to you'
        });
      }
    }

    // Update lead
    const [updatedLead] = await db.update(schema.leads)
      .set({
        first_name: first_name || lead.first_name,
        custom_fields: custom_fields || lead.custom_fields,
        campaign_id: campaign_id || lead.campaign_id,
      })
      .where(schema.leads.id.eq(leadId))
      .returning();

    res.json({
      success: true,
      data: updatedLead
    });
  } catch (error) {
    console.error('Failed to update lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lead'
    });
  }
});

// DELETE /api/leads/:id - Delete lead
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    
    const lead = await db.query.leads.findFirst({
      where: (leads, { and, eq }) => 
        and(
          eq(leads.id, leadId),
          eq(leads.user_id, req.user!.id)
        )
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    // Delete related messages first
    await db.delete(schema.messages)
      .where(schema.messages.lead_id.eq(leadId));

    // Delete lead
    await db.delete(schema.leads)
      .where(schema.leads.id.eq(leadId));

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete lead'
    });
  }
});

// POST /api/leads/bulk-assign - Bulk assign leads to campaign
router.post('/bulk-assign', authenticateToken, async (req, res) => {
  try {
    const { lead_ids, campaign_id } = req.body;

    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Lead IDs array is required'
      });
    }

    if (!campaign_id) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required'
      });
    }

    // Verify campaign ownership
    const campaign = await db.query.campaigns.findFirst({
      where: (campaigns, { and, eq }) => 
        and(
          eq(campaigns.id, campaign_id),
          eq(campaigns.user_id, req.user!.id)
        )
    });

    if (!campaign) {
      return res.status(400).json({
        success: false,
        error: 'Campaign not found or does not belong to you'
      });
    }

    // Update leads
    const result = await db.update(schema.leads)
      .set({ campaign_id })
      .where((leads, { and, eq, inArray }) => 
        and(
          eq(leads.user_id, req.user!.id),
          inArray(leads.id, lead_ids)
        )
      );

    res.json({
      success: true,
      message: 'Leads assigned to campaign successfully'
    });
  } catch (error) {
    console.error('Failed to bulk assign leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk assign leads'
    });
  }
});

// GET /api/leads/stats - Get lead statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { campaign_id } = req.query;
    
    const whereConditions = [(leads: any, { eq }: any) => eq(leads.user_id, req.user!.id)];
    if (campaign_id) {
      whereConditions.push((leads: any, { eq }: any) => eq(leads.campaign_id, parseInt(campaign_id as string)));
    }

    const leads = await db.query.leads.findMany({
      where: (leads, { and, eq }) => {
        const conditions = [eq(leads.user_id, req.user!.id)];
        if (campaign_id) conditions.push(eq(leads.campaign_id, parseInt(campaign_id as string)));
        return and(...conditions);
      }
    });

    const totalLeads = leads.length;
    const pendingLeads = leads.filter(lead => lead.status === 'pending').length;
    const sentLeads = leads.filter(lead => lead.status === 'sent').length;
    const failedLeads = leads.filter(lead => lead.status === 'failed').length;
    const blockedLeads = leads.filter(lead => lead.status === 'blocked').length;

    res.json({
      success: true,
      data: {
        total: totalLeads,
        pending: pendingLeads,
        sent: sentLeads,
        failed: failedLeads,
        blocked: blockedLeads,
        success_rate: totalLeads > 0 ? (sentLeads / totalLeads) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Failed to get lead stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get lead statistics'
    });
  }
});

export default router;
