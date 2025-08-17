import { Router } from 'express'
import { z } from 'zod'
import { db, schema } from '../lib/drizzle'
import { authenticateToken, requireOwnership } from '../lib/auth'
import { eq, and, inArray } from 'drizzle-orm'
import multer from 'multer'
import { parse } from 'csv-parse'

const router: Router = Router()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true)
    } else {
      cb(new Error('Only CSV files are allowed'))
    }
  },
})

// Lead creation schema
const createLeadSchema = z.object({
  profile_url: z.string().url().refine(url => url.includes('instagram.com'), {
    message: 'Profile URL must be from Instagram',
  }),
  first_name: z.string().optional(),
  custom_fields: z.record(z.string()).optional(),
})

// Lead update schema
const updateLeadSchema = z.object({
  profile_url: z.string().url().optional(),
  first_name: z.string().optional(),
  custom_fields: z.record(z.string()).optional(),
  status: z.enum(['pending', 'sent', 'failed', 'blocked']).optional(),
})

// GET /api/leads - List user's leads
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id
    const { page = 1, limit = 10, status, campaign_id } = req.query

    const offset = (Number(page) - 1) * Number(limit)
    
    const whereConditions = [eq(schema.leads.user_id, userId)]
    
    if (status && typeof status === 'string') {
      whereConditions.push(eq(schema.leads.status, status as any))
    }
    
    if (campaign_id && typeof campaign_id === 'string') {
      whereConditions.push(eq(schema.leads.campaign_id, parseInt(campaign_id)))
    }
    
    const whereClause = whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions)

    const leads = await db.query.leads.findMany({
      where: whereClause,
      limit: Number(limit),
      offset,
      orderBy: schema.leads.created_at,
    })

    const total = await db
      .select({ count: schema.leads.id })
      .from(schema.leads)
      .where(whereClause)

    res.json({
      success: true,
      data: {
        items: leads,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: total.length,
          pages: Math.ceil(total.length / Number(limit)),
        },
      },
    })
  } catch (error) {
    console.error('Error fetching leads:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch leads' })
  }
})

// POST /api/leads - Create new lead
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id
    const validatedData = createLeadSchema.parse(req.body)

    // Check if lead already exists for this user
    const existingLead = await db.query.leads.findFirst({
      where: and(
        eq(schema.leads.user_id, userId),
        eq(schema.leads.profile_url, validatedData.profile_url)
      ),
    })

    if (existingLead) {
      return res.status(400).json({
        success: false,
        error: 'Lead with this profile URL already exists',
      })
    }

    const [lead] = await db.insert(schema.leads).values({
      user_id: userId,
      profile_url: validatedData.profile_url,
      first_name: validatedData.first_name,
      custom_fields: validatedData.custom_fields || {},
      status: 'pending',
    }).returning()

    res.status(201).json({
      success: true,
      data: lead,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      })
    }

    console.error('Error creating lead:', error)
    res.status(500).json({ success: false, error: 'Failed to create lead' })
  }
})

// POST /api/leads/upload - Upload CSV file
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const userId = req.user!.id
    const { campaign_id } = req.body

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      })
    }

    const results: any[] = []
    const errors: string[] = []
    let rowNumber = 0

    // Parse CSV
    const csvContent = req.file.buffer.toString('utf-8')
    
    await new Promise((resolve, reject) => {
      parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }, (err, records) => {
        if (err) {
          reject(err)
          return
        }
        
                 records.forEach((data: any) => {
           rowNumber++
           
                       // Store ALL original data as custom fields
            const customFields: Record<string, string> = {}
            Object.keys(data).forEach(key => {
              if (data[key]) {
                customFields[key] = data[key]
              }
            })

            results.push({
              profile_url: null, // Will be set during campaign creation
              first_name: null,
              custom_fields: customFields, // All original data preserved
            })
         })
         
         resolve(undefined)
       })
    })

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'CSV validation errors',
        details: errors,
      })
    }

    // Check for duplicates
    const existingUrls = await db
      .select({ profile_url: schema.leads.profile_url })
      .from(schema.leads)
      .where(
        and(
          eq(schema.leads.user_id, userId),
          // Check if any of the new URLs already exist
        )
      )

    const existingUrlSet = new Set(existingUrls.map(u => u.profile_url))
    const duplicates = results.filter(r => existingUrlSet.has(r.profile_url))

    if (duplicates.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate profile URLs found',
        details: duplicates.map(d => d.profile_url),
      })
    }

    // Insert leads
    const leadsToInsert = results.map(lead => ({
      user_id: userId,
      campaign_id: campaign_id ? parseInt(campaign_id) : null,
      ...lead,
      status: 'pending',
    }))

    const insertedLeads = await db.insert(schema.leads).values(leadsToInsert).returning()

    res.json({
      success: true,
      data: {
        message: `Successfully uploaded ${insertedLeads.length} leads`,
        count: insertedLeads.length,
        leads: insertedLeads,
      },
    })
  } catch (error) {
    console.error('Error uploading leads:', error)
    res.status(500).json({ success: false, error: 'Failed to upload leads' })
  }
})

// GET /api/leads/:id - Get specific lead
router.get('/:id', authenticateToken, requireOwnership('leads'), async (req, res) => {
  try {
    const leadId = parseInt(req.params.id)

    const lead = await db.query.leads.findFirst({
      where: eq(schema.leads.id, leadId),
    })

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
      })
    }

    res.json({
      success: true,
      data: lead,
    })
  } catch (error) {
    console.error('Error fetching lead:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch lead' })
  }
})

// PUT /api/leads/:id - Update lead
router.put('/:id', authenticateToken, requireOwnership('leads'), async (req, res) => {
  try {
    const leadId = parseInt(req.params.id)
    const validatedData = updateLeadSchema.parse(req.body)

    const [updatedLead] = await db
      .update(schema.leads)
      .set({
        ...validatedData,
      })
      .where(eq(schema.leads.id, leadId))
      .returning()

    if (!updatedLead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
      })
    }

    res.json({
      success: true,
      data: updatedLead,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      })
    }

    console.error('Error updating lead:', error)
    res.status(500).json({ success: false, error: 'Failed to update lead' })
  }
})

// DELETE /api/leads/:id - Delete lead
router.delete('/:id', authenticateToken, requireOwnership('leads'), async (req, res) => {
  try {
    const leadId = parseInt(req.params.id)

    const [deletedLead] = await db
      .delete(schema.leads)
      .where(eq(schema.leads.id, leadId))
      .returning()

    if (!deletedLead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
      })
    }

    res.json({
      success: true,
      data: { message: 'Lead deleted successfully' },
    })
  } catch (error) {
    console.error('Error deleting lead:', error)
    res.status(500).json({ success: false, error: 'Failed to delete lead' })
  }
})

// POST /api/leads/bulk-delete - Bulk delete leads
router.post('/bulk-delete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id
    const { lead_ids } = req.body

    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Lead IDs array is required',
      })
    }

    const deletedLeads = await db
      .delete(schema.leads)
      .where(
        and(
          eq(schema.leads.user_id, userId),
          inArray(schema.leads.id, lead_ids.map(id => parseInt(id)))
        )
      )
      .returning()

    res.json({
      success: true,
      data: {
        message: `Successfully deleted ${deletedLeads.length} leads`,
        count: deletedLeads.length,
      },
    })
  } catch (error) {
    console.error('Error bulk deleting leads:', error)
    res.status(500).json({ success: false, error: 'Failed to bulk delete leads' })
  }
})

// GET /api/leads/available - Get leads available for campaigns (not assigned to active campaigns)
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id

    const availableLeads = await db.query.leads.findMany({
      where: and(
        eq(schema.leads.user_id, userId),
        eq(schema.leads.status, 'pending')
      ),
      orderBy: schema.leads.created_at,
    })

    res.json({
      success: true,
      data: availableLeads,
    })
  } catch (error) {
    console.error('Error fetching available leads:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch available leads' })
  }
})

// GET /api/leads/stats - Get lead statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id

    const stats = await db
      .select({
        total: schema.leads.id,
        pending: schema.leads.status,
        sent: schema.leads.status,
        failed: schema.leads.status,
        blocked: schema.leads.status,
      })
      .from(schema.leads)
      .where(eq(schema.leads.user_id, userId))

    const total = stats.length
    const pending = stats.filter(s => s.pending === 'pending').length
    const sent = stats.filter(s => s.sent === 'sent').length
    const failed = stats.filter(s => s.failed === 'failed').length
    const blocked = stats.filter(s => s.blocked === 'blocked').length

    res.json({
      success: true,
      data: {
        total,
        pending,
        sent,
        failed,
        blocked,
        success_rate: total > 0 ? (sent / total) * 100 : 0,
      },
    })
  } catch (error) {
    console.error('Error fetching lead stats:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch lead stats' })
  }
})

export default router
