import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import Papa from "papaparse";
import { insertLeadFileSchema, insertCampaignSchema } from "@shared/schema";
import { z } from "zod";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Analytics endpoint
  app.get("/api/analytics/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json({ success: true, stats });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ success: false, error: "Failed to fetch stats" });
    }
  });

  // Lead Files endpoints
  app.get("/api/lead-files", async (req, res) => {
    try {
      const leadFiles = await storage.getLeadFiles();
      res.json({ success: true, leadFiles });
    } catch (error) {
      console.error("Error fetching lead files:", error);
      res.status(500).json({ success: false, error: "Failed to fetch lead files" });
    }
  });

  app.post("/api/lead-files/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "No file uploaded" });
      }

      const csvData = req.file.buffer.toString('utf8');
      const parsed = Papa.parse(csvData, { header: true });
      
      if (parsed.errors.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid CSV format",
          details: parsed.errors 
        });
      }

      const columnNames = parsed.meta.fields || [];
      
      res.json({
        success: true,
        data: {
          fileName: req.file.originalname,
          columnNames,
          rowCount: parsed.data.length,
          preview: parsed.data.slice(0, 5)
        }
      });
    } catch (error) {
      console.error("Error parsing CSV:", error);
      res.status(500).json({ success: false, error: "Failed to parse CSV" });
    }
  });

  app.post("/api/lead-files/import", async (req, res) => {
    try {
      const { fileName, csvData, selectedColumns } = req.body;
      
      if (!fileName || !csvData || !selectedColumns || selectedColumns.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: "Missing required fields" 
        });
      }

      const parsed = Papa.parse(csvData, { header: true });
      const columnNames = parsed.meta.fields || [];
      
      // Create lead file record
      const leadFile = await storage.createLeadFile({
        name: fileName.replace(/\.[^/.]+$/, ""), // Remove extension
        originalName: fileName,
        columnNames,
        selectedColumns,
        rowCount: parsed.data.length
      });

      // Create individual lead records
      const leads = [];
      for (const row of parsed.data) {
        const rowData = row as Record<string, any>;
        
        // Find profile URL column
        const profileUrlColumn = selectedColumns.find(col => 
          col.toLowerCase().includes('profile') || 
          col.toLowerCase().includes('url') ||
          col.toLowerCase().includes('instagram')
        );
        
        const profileUrl = profileUrlColumn ? rowData[profileUrlColumn] : '';
        
        if (profileUrl) {
          const lead = await storage.createLead({
            leadFileId: leadFile.id,
            profileUrl,
            message: rowData.message || rowData.Message || '',
            data: rowData
          });
          leads.push(lead);
        }
      }

      res.json({
        success: true,
        leadFile,
        leadsCount: leads.length
      });
    } catch (error) {
      console.error("Error importing leads:", error);
      res.status(500).json({ success: false, error: "Failed to import leads" });
    }
  });

  // Leads endpoints
  app.get("/api/leads", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      res.json({ success: true, leads });
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ success: false, error: "Failed to fetch leads" });
    }
  });

  // Campaigns endpoints
  app.get("/api/campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json({ success: true, campaigns });
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ success: false, error: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/campaigns", async (req, res) => {
    try {
      const validatedData = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(validatedData);
      res.json({ success: true, campaign });
    } catch (error) {
      console.error("Error creating campaign:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, error: "Invalid data", details: error.errors });
      } else {
        res.status(500).json({ success: false, error: "Failed to create campaign" });
      }
    }
  });

  app.get("/api/campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const campaign = await storage.getCampaign(id);
      
      if (!campaign) {
        return res.status(404).json({ success: false, error: "Campaign not found" });
      }
      
      res.json({ success: true, campaign });
    } catch (error) {
      console.error("Error fetching campaign:", error);
      res.status(500).json({ success: false, error: "Failed to fetch campaign" });
    }
  });

  // Template/Column endpoints
  app.get("/api/templates/columns", async (req, res) => {
    try {
      const columns = await storage.getAvailableColumns();
      res.json({ success: true, columns });
    } catch (error) {
      console.error("Error fetching columns:", error);
      res.status(500).json({ success: false, error: "Failed to fetch columns" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}