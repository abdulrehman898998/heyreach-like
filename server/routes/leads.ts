import { Router } from 'express';
import { getDatabase } from '../db.js';
import { leads } from '../../shared/schema.js';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import multer from 'multer';
import { parse } from 'csv-parse';

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

// Validation schemas
const uploadLeadsSchema = z.object({
  profileUrlColumn: z.string().min(1),
  firstNameColumn: z.string().optional(),
  messageColumn: z.string().optional(),
});

// POST /api/leads/upload - Upload leads CSV
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { profileUrlColumn, firstNameColumn, messageColumn } = uploadLeadsSchema.parse(req.body);
    const db = getDatabase();

    // Parse CSV
    const csvContent = req.file.buffer.toString('utf-8');
    const records: any[] = [];

    await new Promise((resolve, reject) => {
      parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }, (err, data) => {
        if (err) reject(err);
        else {
          records.push(...data);
          resolve(data);
        }
      });
    });

    if (records.length === 0) {
      return res.status(400).json({ error: 'No valid records found in CSV' });
    }

    // Validate required column exists
    const firstRecord = records[0];
    if (!firstRecord[profileUrlColumn]) {
      return res.status(400).json({ 
        error: `Column '${profileUrlColumn}' not found in CSV` 
      });
    }

    // Validate profile URLs
    const validRecords = records.filter(record => {
      const profileUrl = record[profileUrlColumn];
      return profileUrl && (
        profileUrl.includes('instagram.com/') || 
        profileUrl.includes('instagram.com')
      );
    });

    if (validRecords.length === 0) {
      return res.status(400).json({ 
        error: 'No valid Instagram profile URLs found' 
      });
    }

    // Create leads
    const leadsToCreate = validRecords.map(record => {
      const customFields: Record<string, any> = { ...record };
      
      // Remove main fields from custom fields
      delete customFields[profileUrlColumn];
      if (firstNameColumn) delete customFields[firstNameColumn];
      if (messageColumn) delete customFields[messageColumn];

      return {
        user_id: 1, // TODO: Get from auth
        profile_url: record[profileUrlColumn],
        first_name: firstNameColumn ? record[firstNameColumn] : null,
        custom_fields: {
          ...customFields,
          ...(messageColumn && { message: record[messageColumn] }),
        },
        status: 'pending',
      };
    });

    const createdLeads = await db.insert(leads).values(leadsToCreate).returning();

    res.json({
      success: true,
      message: `Successfully uploaded ${createdLeads.length} leads`,
      leads: createdLeads.map(lead => ({
        id: lead.id,
        profile_url: lead.profile_url,
        first_name: lead.first_name,
        status: lead.status,
      })),
      stats: {
        total: records.length,
        valid: validRecords.length,
        invalid: records.length - validRecords.length,
      },
    });

  } catch (error) {
    console.error('Error uploading leads:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// GET /api/leads - List leads
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const leadList = await db.query.leads.findMany({
      orderBy: [desc(leads.created_at)],
    });

    res.json({
      success: true,
      leads: leadList,
    });

  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// GET /api/leads/:id - Get lead by ID
router.get('/:id', async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const db = getDatabase();

    const lead = await db.query.leads.findFirst({
      where: eq(leads.id, leadId),
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({
      success: true,
      lead,
    });

  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// DELETE /api/leads/:id - Delete lead
router.delete('/:id', async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const db = getDatabase();

    const deletedLead = await db.delete(leads)
      .where(eq(leads.id, leadId))
      .returning();

    if (deletedLead.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({
      success: true,
      message: 'Lead deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

export default router;
