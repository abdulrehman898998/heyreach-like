import express from "express";
import { campaignService } from "../services/campaignService";
import { storage } from "../storage";

const router = express.Router();

// Get all campaigns for user
router.get("/", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const campaigns = await campaignService.getUserCampaigns(userId);
    
    res.json({
      success: true,
      campaigns: campaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        totalTargets: campaign.totalTargets,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Error getting campaigns:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get campaigns",
    });
  }
});

// Create new campaign
router.post("/", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { name, message, accountIds, startNow, scheduling, messagesPerAccount, delayBetweenMessages } = req.body;

    // Handle different campaign creation formats
    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Campaign name is required",
      });
    }

    // If message is provided, use it. Otherwise, create a default message
    const campaignMessage = message || `Hello! This is a message from your ${name} campaign.`;
    
    // Ensure message is never empty
    if (!campaignMessage || campaignMessage.trim() === '') {
      return res.status(400).json({
        success: false,
        error: "Campaign message cannot be empty",
      });
    }
    
    // If accountIds is provided, use it. Otherwise, get all user accounts
    let selectedAccountIds = accountIds;
    if (!selectedAccountIds || selectedAccountIds.length === 0) {
      const userAccounts = await (storage as any).getInstagramAccountsByUser(userId);
      selectedAccountIds = userAccounts.map((acc: any) => acc.id);
    }

    if (selectedAccountIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No Instagram accounts available. Please add accounts first.",
      });
    }

    // Handle different scheduling formats
    let campaignScheduling;
    if (scheduling) {
      // If scheduling object is provided directly
      campaignScheduling = {
        startTime: startNow ? new Date(Date.now() + 5000).toISOString() : new Date(Date.now() + 60000).toISOString(),
        maxMessagesPerDay: scheduling.maxMessagesPerDay || 50,
        delayBetweenMessages: scheduling.delayBetweenMessages || 30,
        accountRotation: scheduling.accountRotation || "round-robin"
      };
    } else if (messagesPerAccount || delayBetweenMessages) {
      // If individual scheduling parameters are provided
      campaignScheduling = {
        startTime: startNow ? new Date(Date.now() + 5000).toISOString() : new Date(Date.now() + 60000).toISOString(),
        maxMessagesPerDay: messagesPerAccount || 50,
        delayBetweenMessages: delayBetweenMessages || 30,
        accountRotation: "round-robin"
      };
    } else {
      // Default scheduling
      campaignScheduling = {
        startTime: startNow ? new Date(Date.now() + 5000).toISOString() : new Date(Date.now() + 60000).toISOString(),
        maxMessagesPerDay: 50,
        delayBetweenMessages: 30,
        accountRotation: "round-robin"
      };
    }

    // Create campaign using the service
    const campaign = await campaignService.createCampaign(userId, {
      name,
      templateId: null, // We'll handle templates separately
      leadFileId: null, // We'll handle leads separately
      scheduling: campaignScheduling
    });
    
    res.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        totalTargets: campaign.totalTargets,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error creating campaign:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create campaign",
    });
  }
});

// Get campaign by ID
router.get("/:id", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const campaignId = parseInt(req.params.id);

    const campaign = await campaignService.getCampaign(campaignId);
    if (!campaign || campaign.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    res.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        totalTargets: campaign.totalTargets,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
        scheduling: campaign.scheduling,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error getting campaign:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get campaign",
    });
  }
});

// Start campaign
router.post("/:id/start", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const campaignId = parseInt(req.params.id);

    // Verify campaign belongs to user
    const campaign = await campaignService.getCampaign(campaignId);
    if (!campaign || campaign.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    await campaignService.startCampaign(campaignId);
    
    res.json({
      success: true,
      message: "Campaign started successfully",
    });
  } catch (error) {
    console.error("Error starting campaign:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to start campaign",
    });
  }
});

// Pause campaign
router.post("/:id/pause", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const campaignId = parseInt(req.params.id);

    // Verify campaign belongs to user
    const campaign = await campaignService.getCampaign(campaignId);
    if (!campaign || campaign.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    await campaignService.pauseCampaign(campaignId);
    
    res.json({
      success: true,
      message: "Campaign paused successfully",
    });
  } catch (error) {
    console.error("Error pausing campaign:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to pause campaign",
    });
  }
});

// Resume campaign
router.post("/:id/resume", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const campaignId = parseInt(req.params.id);

    // Verify campaign belongs to user
    const campaign = await campaignService.getCampaign(campaignId);
    if (!campaign || campaign.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    await campaignService.resumeCampaign(campaignId);
    
    res.json({
      success: true,
      message: "Campaign resumed successfully",
    });
  } catch (error) {
    console.error("Error resuming campaign:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to resume campaign",
    });
  }
});

// Delete campaign
router.delete("/:id", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const campaignId = parseInt(req.params.id);

    // Verify campaign belongs to user
    const campaign = await campaignService.getCampaign(campaignId);
    if (!campaign || campaign.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    await campaignService.deleteCampaign(campaignId);
    
    res.json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete campaign",
    });
  }
});

// Get campaign statistics
router.get("/:id/stats", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const campaignId = parseInt(req.params.id);

    // Verify campaign belongs to user
    const campaign = await campaignService.getCampaign(campaignId);
    if (!campaign || campaign.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    const stats = await campaignService.getCampaignStats(campaignId);
    
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error getting campaign stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get campaign statistics",
    });
  }
});

// Get campaign progress
router.get("/:id/progress", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const campaignId = parseInt(req.params.id);

    // Verify campaign belongs to user
    const campaign = await campaignService.getCampaign(campaignId);
    if (!campaign || campaign.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    const progress = await campaignService.getCampaignProgress(campaignId);
    
    res.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error("Error getting campaign progress:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get campaign progress",
    });
  }
});

// Search campaigns
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

    const campaigns = await campaignService.searchCampaigns(userId, keyword);
    
    res.json({
      success: true,
      campaigns: campaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        totalTargets: campaign.totalTargets,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Error searching campaigns:", error);
    res.status(500).json({
      success: false,
      error: "Failed to search campaigns",
    });
  }
});

// Get campaigns by status
router.get("/status/:status", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const status = req.params.status;

    const campaigns = await campaignService.getCampaignsByStatus(userId, status);
    
    res.json({
      success: true,
      campaigns: campaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        totalTargets: campaign.totalTargets,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Error getting campaigns by status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get campaigns by status",
    });
  }
});

// Get user campaign statistics
router.get("/stats/overview", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const stats = await campaignService.getUserCampaignStats(userId);
    
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error getting user campaign stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get user campaign statistics",
    });
  }
});

// Check if user can create campaign
router.get("/can-create", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const result = await campaignService.canCreateCampaign(userId);
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error checking campaign creation:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check campaign creation",
    });
  }
});

// Get campaign recommendations
router.get("/recommendations", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const recommendations = await campaignService.getCampaignRecommendations(userId);
    
    res.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    console.error("Error getting campaign recommendations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get campaign recommendations",
    });
  }
});

export default router;
