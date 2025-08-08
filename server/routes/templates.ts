import express from "express";
import { templateService } from "../services/templateService";

const router = express.Router();

// Get all templates for user
router.get("/", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const templates = await templateService.getUserTemplates(userId);
    
    res.json({
      success: true,
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        content: template.content,
        variables: template.variables,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Error getting templates:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get templates",
    });
  }
});

// Create new template
router.post("/", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { name, content } = req.body;

    if (!name || !content) {
      return res.status(400).json({
        success: false,
        error: "Name and content are required",
      });
    }

    const template = await templateService.createTemplate(userId, name, content);
    
    res.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        content: template.content,
        variables: template.variables,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create template",
    });
  }
});

// Get template by ID
router.get("/:id", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const templateId = parseInt(req.params.id);

    const template = await templateService.getTemplate(templateId);
    if (!template || template.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Template not found",
      });
    }

    res.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        content: template.content,
        variables: template.variables,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error getting template:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get template",
    });
  }
});

// Update template
router.put("/:id", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const templateId = parseInt(req.params.id);
    const { name, content } = req.body;

    // Verify template belongs to user
    const existingTemplate = await templateService.getTemplate(templateId);
    if (!existingTemplate || existingTemplate.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Template not found",
      });
    }

    const updates: { name?: string; content?: string } = {};
    if (name !== undefined) updates.name = name;
    if (content !== undefined) updates.content = content;

    const template = await templateService.updateTemplate(templateId, updates);
    
    res.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        content: template.content,
        variables: template.variables,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating template:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update template",
    });
  }
});

// Delete template
router.delete("/:id", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const templateId = parseInt(req.params.id);

    // Verify template belongs to user
    const template = await templateService.getTemplate(templateId);
    if (!template || template.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Template not found",
      });
    }

    await templateService.deleteTemplate(templateId);
    
    res.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete template",
    });
  }
});

// Search templates
router.get("/search", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const keyword = req.query.keyword as string;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: "Search keyword is required",
      });
    }

    const templates = await templateService.searchTemplates(userId, keyword);
    
    res.json({
      success: true,
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        content: template.content,
        variables: template.variables,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Error searching templates:", error);
    res.status(500).json({
      success: false,
      error: "Failed to search templates",
    });
  }
});

// Validate template
router.post("/validate", async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: "Template content is required",
      });
    }

    const validation = templateService.validateTemplate(content);
    
    res.json({
      success: true,
      validation,
    });
  } catch (error) {
    console.error("Error validating template:", error);
    res.status(500).json({
      success: false,
      error: "Failed to validate template",
    });
  }
});

// Generate template preview
router.post("/preview", async (req, res) => {
  try {
    const { content, sampleData } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: "Template content is required",
      });
    }

    const preview = templateService.generatePreview({
      content,
      sampleData: sampleData || {},
    });
    
    res.json({
      success: true,
      preview,
    });
  } catch (error) {
    console.error("Error generating preview:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate preview",
    });
  }
});

// Get available variables from lead data
router.post("/variables", async (req, res) => {
  try {
    const { leadData } = req.body;

    const variables = templateService.getAvailableVariables(leadData || {});
    
    res.json({
      success: true,
      variables,
    });
  } catch (error) {
    console.error("Error getting variables:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get variables",
    });
  }
});

// Generate sample data for template testing
router.post("/sample-data", async (req, res) => {
  try {
    const { variables } = req.body;

    if (!variables || !Array.isArray(variables)) {
      return res.status(400).json({
        success: false,
        error: "Variables array is required",
      });
    }

    const sampleData = templateService.generateSampleData(variables);
    
    res.json({
      success: true,
      sampleData,
    });
  } catch (error) {
    console.error("Error generating sample data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate sample data",
    });
  }
});

// Get available columns for slash-based selection
router.get("/columns", async (req, res) => {
  try {
    const userId = (req as any).userId;
    
    // Provide default columns for Instagram automation
    const defaultColumns = [
      'name', 'profile_url', 'username', 'email', 'phone', 'company', 
      'website', 'bio', 'followers', 'following', 'posts', 'location', 
      'industry', 'interests', 'tags', 'notes'
    ];
    
    // For now, just return default columns to avoid database errors
    res.json({
      success: true,
      columns: defaultColumns,
    });
  } catch (error) {
    console.error("Error getting columns:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get columns",
    });
  }
});

// Get dynamic fields from template content
router.post("/dynamic-fields", async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: "Template content is required",
      });
    }

    const fields = templateService.getAvailableDynamicFields(content);
    
    res.json({
      success: true,
      fields,
    });
  } catch (error) {
    console.error("Error getting dynamic fields:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get dynamic fields",
    });
  }
});

// Get template statistics
router.get("/stats", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const stats = await templateService.getTemplateStats(userId);
    
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error getting template stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get template statistics",
    });
  }
});

// Duplicate template
router.post("/:id/duplicate", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const templateId = parseInt(req.params.id);
    const { newName } = req.body;

    if (!newName) {
      return res.status(400).json({
        success: false,
        error: "New name is required",
      });
    }

    // Verify template belongs to user
    const existingTemplate = await templateService.getTemplate(templateId);
    if (!existingTemplate || existingTemplate.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Template not found",
      });
    }

    const template = await templateService.duplicateTemplate(templateId, newName);
    
    res.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        content: template.content,
        variables: template.variables,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error duplicating template:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to duplicate template",
    });
  }
});

// Test template with multiple sample datasets
router.post("/test", async (req, res) => {
  try {
    const { content, sampleDatasets } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: "Template content is required",
      });
    }

    if (!sampleDatasets || !Array.isArray(sampleDatasets)) {
      return res.status(400).json({
        success: false,
        error: "Sample datasets array is required",
      });
    }

    const results = templateService.testTemplate(content, sampleDatasets);
    
    res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Error testing template:", error);
    res.status(500).json({
      success: false,
      error: "Failed to test template",
    });
  }
});

export default router;
