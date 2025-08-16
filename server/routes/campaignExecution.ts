import express from 'express';
import { z } from 'zod';
import { campaignExecutionService } from '../services/campaignExecutionService';
import { storage } from '../storage';

const router = express.Router();

// Start campaign execution
const startCampaignSchema = z.object({
  campaignId: z.number().positive()
});

router.post('/start', async (req, res) => {
  try {
    const { campaignId } = startCampaignSchema.parse(req.body);
    
    const result = await campaignExecutionService.startCampaign(campaignId);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        details: result.details
      });
    }
  } catch (error) {
    console.error('Error starting campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start campaign'
    });
  }
});

// Stop campaign execution
const stopCampaignSchema = z.object({
  campaignId: z.number().positive()
});

router.post('/stop', async (req, res) => {
  try {
    const { campaignId } = stopCampaignSchema.parse(req.body);
    
    const result = await campaignExecutionService.stopCampaign(campaignId);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error stopping campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop campaign'
    });
  }
});

// Pause campaign execution
router.post('/pause', async (req, res) => {
  try {
    const { campaignId } = stopCampaignSchema.parse(req.body);
    
    const result = await campaignExecutionService.pauseCampaign(campaignId);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error pausing campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pause campaign'
    });
  }
});

// Resume campaign execution
router.post('/resume', async (req, res) => {
  try {
    const { campaignId } = startCampaignSchema.parse(req.body);
    
    const result = await campaignExecutionService.resumeCampaign(campaignId);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error resuming campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resume campaign'
    });
  }
});

// Get campaign execution status
router.get('/status/:campaignId', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId);
    
    if (isNaN(campaignId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign ID'
      });
    }
    
    const isRunning = campaignExecutionService.getCampaignStatus(campaignId);
    
    res.json({
      success: true,
      data: {
        campaignId,
        isRunning
      }
    });
  } catch (error) {
    console.error('Error getting campaign status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign status'
    });
  }
});

// Get campaign execution history
router.get('/history/:campaignId', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId);
    
    if (isNaN(campaignId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign ID'
      });
    }
    
    const executions = await storage.executions.getExecutionsByCampaignId(campaignId);
    
    res.json({
      success: true,
      data: executions
    });
  } catch (error) {
    console.error('Error getting campaign history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign history'
    });
  }
});

// Get all recent executions
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const executions = await storage.executions.getRecentExecutions(limit);
    
    res.json({
      success: true,
      data: executions
    });
  } catch (error) {
    console.error('Error getting recent executions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recent executions'
    });
  }
});

// Get execution statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await storage.executions.getExecutionStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting execution stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get execution statistics'
    });
  }
});

export default router;
