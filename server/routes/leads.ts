import express from "express";
import multer from "multer";
import { leadService } from "../services/leadService";

const router = express.Router();

// Configure multer for file uploads - simplified
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Get all lead files for user
router.get("/files", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const files = await leadService.getUserLeadFiles(userId);
    
    res.json({
      success: true,
      files: files.map(file => ({
        id: file.id,
        name: file.filename,
        totalRows: file.totalRows,
        uploadedAt: file.uploadedAt,
        columnMapping: file.columnMapping,
      })),
    });
  } catch (error) {
    console.error("Error getting lead files:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get lead files",
    });
  }
});

// Simple test route without multer
router.post("/test", async (req, res) => {
  console.log("Test route hit");
  res.json({ success: true, message: "Test route working" });
});

// Preview CSV file to get available columns and suggested mapping
router.post("/preview", upload.single("file"), async (req, res) => {
  try {
    console.log("Preview route hit");
    const file = req.file;
    
    if (!file) {
      console.log("No file uploaded");
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    console.log("File received:", file.originalname, file.size);
    const csvContent = file.buffer.toString("utf-8");
    console.log("CSV content length:", csvContent.length);
    
    console.log("Calling leadService.previewCSV...");
    const preview = await leadService.previewCSV(csvContent);
    console.log("Preview result:", preview);

    if (preview.success) {
      res.json({
        success: true,
        availableColumns: preview.availableColumns,
        suggestedMapping: preview.suggestedMapping,
        preview: preview.preview,
        totalRows: preview.totalRows,
      });
    } else {
      res.status(400).json({
        success: false,
        error: "Failed to preview CSV file",
      });
    }
  } catch (error) {
    console.error("Error previewing CSV:", error);
    console.error("Error stack:", (error as Error).stack);
    res.status(500).json({
      success: false,
      error: "Failed to preview CSV file",
      details: (error as Error).message
    });
  }
});

// Upload CSV file with multer and proper error handling
router.post("/upload", (req, res, next) => {
  console.log("Starting upload process...");
  
  upload.single("file")(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({
        success: false,
        error: "File upload error",
        details: err.message
      });
    }
    
    console.log("Multer processed successfully");
    console.log("File:", req.file);
    console.log("Body:", req.body);
    
    // Continue with the upload logic
    handleUpload(req, res);
  });
});

async function handleUpload(req: any, res: any) {
  try {
    const userId = (req as any).userId;
    const file = req.file;
    const { columnMapping } = req.body || {};

    if (!file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    const csvContent = file.buffer.toString("utf-8");
    let parsedColumnMapping;
    
    try {
      parsedColumnMapping = columnMapping ? JSON.parse(columnMapping) : undefined;
    } catch (parseError) {
      console.error("Error parsing columnMapping:", parseError);
      return res.status(400).json({
        success: false,
        error: "Invalid column mapping format",
      });
    }

    // If no column mapping provided, return preview only
    if (!parsedColumnMapping) {
      console.log("No column mapping provided, returning preview only");
      const preview = await leadService.previewCSV(csvContent);
      if (preview.success) {
        return res.json({
          success: true,
          preview: true,
          availableColumns: preview.availableColumns,
          suggestedMapping: preview.suggestedMapping,
          preview: preview.preview,
          totalRows: preview.totalRows,
        });
      } else {
        return res.status(400).json({
          success: false,
          error: "Failed to preview CSV file",
        });
      }
    }

    // Process the upload with column mapping
    const result = await leadService.processCSVUpload(
      userId,
      file.originalname,
      csvContent,
      parsedColumnMapping
    );

    // Always return preview; HTTP 200 on success, 400 on validation errors
    if (result.success) {
      res.json({
        success: true,
        fileId: result.fileId,
        totalRows: result.totalRows,
        preview: result.preview,
      });
    } else {
      res.status(400).json({
        success: false,
        errors: result.errors,
        totalRows: result.totalRows,
        preview: result.preview,
      });
    }
  } catch (error) {
    console.error("Error uploading CSV:", error);
    console.error("Error stack:", (error as Error).stack);
    res.status(500).json({
      success: false,
      error: "Failed to upload CSV file",
      details: (error as Error).message
    });
  }
}

// Get leads from a file with pagination
router.get("/files/:fileId/leads", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const fileId = parseInt(req.params.fileId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Verify file belongs to user
    const file = await leadService.getLeadFile(fileId);
    if (!file || file.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Lead file not found",
      });
    }

    const result = await leadService.getLeads(fileId, page, limit);
    
    res.json({
      success: true,
      leads: result.leads.map(lead => ({
        id: lead.id,
        profileUrl: lead.profileUrl,
        name: lead.name,
        customFields: lead.customFields,
        createdAt: lead.createdAt,
      })),
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error getting leads:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get leads",
    });
  }
});

// Get lead file details
router.get("/files/:fileId", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const fileId = parseInt(req.params.fileId);

    const file = await leadService.getLeadFile(fileId);
    if (!file || file.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Lead file not found",
      });
    }

    const stats = await leadService.getLeadStats(fileId);

    res.json({
      success: true,
      file: {
        id: file.id,
        name: file.filename,
        totalRows: file.totalRows,
        uploadedAt: file.uploadedAt,
        columnMapping: file.columnMapping,
      },
      stats,
    });
  } catch (error) {
    console.error("Error getting lead file:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get lead file",
    });
  }
});

// Search leads in a file
router.get("/files/:fileId/search", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const fileId = parseInt(req.params.fileId);
    const keyword = req.query.keyword as string;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: "Search keyword is required",
      });
    }

    // Verify file belongs to user
    const file = await leadService.getLeadFile(fileId);
    if (!file || file.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Lead file not found",
      });
    }

    const leads = await leadService.searchLeads(fileId, keyword);
    
    res.json({
      success: true,
      leads: leads.map(lead => ({
        id: lead.id,
        profileUrl: lead.profileUrl,
        name: lead.name,
        customFields: lead.customFields,
        createdAt: lead.createdAt,
      })),
      total: leads.length,
    });
  } catch (error) {
    console.error("Error searching leads:", error);
    res.status(500).json({
      success: false,
      error: "Failed to search leads",
    });
  }
});

// Delete lead file
router.delete("/files/:fileId", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const fileId = parseInt(req.params.fileId);

    // Verify file belongs to user
    const file = await leadService.getLeadFile(fileId);
    if (!file || file.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Lead file not found",
      });
    }

    await leadService.deleteLeadFile(fileId);
    
    res.json({
      success: true,
      message: "Lead file deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting lead file:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete lead file",
    });
  }
});

// Get lead statistics
router.get("/files/:fileId/stats", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const fileId = parseInt(req.params.fileId);

    // Verify file belongs to user
    const file = await leadService.getLeadFile(fileId);
    if (!file || file.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Lead file not found",
      });
    }

    const stats = await leadService.getLeadStats(fileId);
    
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error getting lead stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get lead statistics",
    });
  }
});

export default router;
