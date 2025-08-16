import express from 'express';
import { z } from 'zod';
import { storage } from '../storage';

const router = express.Router();

// Validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  content: z.string().min(1, 'Template content is required'),
  isActive: z.boolean().default(true)
});

const updateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').optional(),
  content: z.string().min(1, 'Template content is required').optional(),
  isActive: z.boolean().optional()
});

// Extract variables from template content
const extractVariables = (content: string): string[] => {
  const variables = new Set<string>();
  
  // Match both {{variable}} and /variable formats
  const matches = content.match(/\{\{(\w+)\}\}|\/(\w+)/g);
  
  if (matches) {
    matches.forEach(match => {
      const variable = match.replace(/[{}/]/g, '');
      variables.add(variable);
    });
  }
  
  return Array.from(variables);
};

// GET /api/templates - Get all templates
router.get('/', async (req, res) => {
  try {
    const templates = await storage.templates.getAllTemplates();
    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    });
  }
});

// GET /api/templates/:id - Get template by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID'
      });
    }

    const template = await storage.templates.getTemplateById(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template'
    });
  }
});

// POST /api/templates - Create new template
router.post('/', async (req, res) => {
  try {
    const validatedData = createTemplateSchema.parse(req.body);
    
    // Extract variables from content
    const variables = extractVariables(validatedData.content);
    
    const template = await storage.templates.createTemplate({
      ...validatedData,
      variables
    });

    res.status(201).json({
      success: true,
      template
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template'
    });
  }
});

// PUT /api/templates/:id - Update template
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID'
      });
    }

    const validatedData = updateTemplateSchema.parse(req.body);
    
    // Check if template exists
    const existingTemplate = await storage.templates.getTemplateById(id);
    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Extract variables if content is being updated
    let variables = existingTemplate.variables;
    if (validatedData.content) {
      variables = extractVariables(validatedData.content);
    }

    const template = await storage.templates.updateTemplate(id, {
      ...validatedData,
      variables
    });

    res.json({
      success: true,
      template
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update template'
    });
  }
});

// DELETE /api/templates/:id - Delete template
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID'
      });
    }

    const deleted = await storage.templates.deleteTemplate(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template'
    });
  }
});

// POST /api/templates/:id/duplicate - Duplicate template
router.post('/:id/duplicate', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID'
      });
    }

    const originalTemplate = await storage.templates.getTemplateById(id);
    if (!originalTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const duplicatedTemplate = await storage.templates.createTemplate({
      name: `${originalTemplate.name} (Copy)`,
      content: originalTemplate.content,
      variables: originalTemplate.variables,
      isActive: false // Start as inactive
    });

    res.status(201).json({
      success: true,
      template: duplicatedTemplate
    });
  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to duplicate template'
    });
  }
});

// POST /api/templates/preview - Preview template with variables
router.post('/preview', async (req, res) => {
  try {
    const { content, variables } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Template content is required'
      });
    }

    // Replace variables with provided values
    let previewContent = content;
    if (variables && typeof variables === 'object') {
      Object.entries(variables).forEach(([key, value]) => {
        const regex1 = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        const regex2 = new RegExp(`\\/${key}`, 'g');
        previewContent = previewContent.replace(regex1, String(value));
        previewContent = previewContent.replace(regex2, String(value));
      });
    }

    res.json({
      success: true,
      preview: previewContent
    });
  } catch (error) {
    console.error('Error previewing template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview template'
    });
  }
});

export default router;
