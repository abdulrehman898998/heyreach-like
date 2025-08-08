import { storage } from "../storage";
import { type NewCampaign, type Campaign, type CampaignScheduling } from "@shared/schema";

export interface CreateCampaignRequest {
  name: string;
  templateId?: number;
  leadFileId?: number;
  scheduling: CampaignScheduling;
}

export interface CampaignStats {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  failed: number;
  successRate: number;
}

export interface CampaignProgress {
  campaignId: number;
  status: string;
  totalTargets: number;
  sentCount: number;
  failedCount: number;
  progress: number; // 0-100
  estimatedCompletion: string;
  nextMessageTime: string;
}

export class CampaignService {
  /**
   * Create a new campaign
   */
  async createCampaign(userId: string, request: CreateCampaignRequest): Promise<Campaign> {
    // Validate campaign data
    await this.validateCampaignData(userId, request);

    const campaignData: NewCampaign = {
      userId,
      name: request.name,
      templateId: request.templateId || null,
      leadFileId: request.leadFileId || null,
      status: "draft",
      scheduling: request.scheduling,
      totalTargets: 0,
      sentCount: 0,
      failedCount: 0,
    };

    return await storage.createCampaign(campaignData);
  }

  /**
   * Validate campaign data before creation
   */
  private async validateCampaignData(userId: string, request: CreateCampaignRequest): Promise<void> {
    // Check if template exists and belongs to user (if provided)
    if (request.templateId) {
      const template = await storage.getTemplateById(request.templateId);
      if (!template || template.userId !== userId) {
        throw new Error("Template not found or access denied");
      }
    }

    // Check if lead file exists and belongs to user (if provided)
    if (request.leadFileId) {
      const leadFile = await storage.getLeadFileById(request.leadFileId);
      if (!leadFile || leadFile.userId !== userId) {
        throw new Error("Lead file not found or access denied");
      }
    }

    // Validate scheduling
    this.validateScheduling(request.scheduling);

    // Check if user has Instagram accounts
    const accounts = await storage.getInstagramAccountsByUser(userId);
    if (accounts.length === 0) {
      throw new Error("No Instagram accounts available. Please add accounts first.");
    }

    // Check account health
    const healthyAccounts = await storage.getHealthyAccounts(userId, 50);
    if (healthyAccounts.length === 0) {
      throw new Error("No healthy Instagram accounts available. Please check account health.");
    }
  }

  /**
   * Validate campaign scheduling
   */
  private validateScheduling(scheduling: CampaignScheduling): void {
    const errors: string[] = [];

    // Validate start time - be more flexible
    try {
      const startTime = new Date(scheduling.startTime);
      if (isNaN(startTime.getTime())) {
        errors.push("Invalid start time");
      } else if (startTime < new Date(Date.now() - 60000)) { // Allow 1 minute in the past
        errors.push("Start time cannot be more than 1 minute in the past");
      }
    } catch (error) {
      errors.push("Invalid start time format");
    }

    // Validate message limits
    if (scheduling.maxMessagesPerDay < 1 || scheduling.maxMessagesPerDay > 150) {
      errors.push("Max messages per day must be between 1 and 150");
    }

    if (scheduling.delayBetweenMessages < 5) { // Reduced minimum delay
      errors.push("Delay between messages must be at least 5 seconds");
    }

    // Validate account rotation - be more flexible
    const validRotations = ["round-robin", "health-based", "load-balanced"];
    if (!scheduling.accountRotation || !validRotations.includes(scheduling.accountRotation)) {
      // Set default if invalid
      scheduling.accountRotation = "round-robin";
    }

    if (errors.length > 0) {
      throw new Error(`Scheduling validation failed: ${errors.join(", ")}`);
    }
  }

  /**
   * Start a campaign
   */
  async startCampaign(campaignId: number): Promise<void> {
    const campaign = await storage.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.status !== "draft") {
      throw new Error("Campaign can only be started from draft status");
    }

    // Generate messages for the campaign
    await storage.generateMessagesForCampaign(campaignId);

    // Update campaign status
    await storage.updateCampaign(campaignId, {
      status: "scheduled",
    });
  }

  /**
   * Pause a campaign
   */
  async pauseCampaign(campaignId: number): Promise<void> {
    const campaign = await storage.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

         if (!["scheduled", "running"].includes(campaign.status || "")) {
      throw new Error("Campaign cannot be paused in current status");
    }

    await storage.updateCampaign(campaignId, {
      status: "paused",
    });
  }

  /**
   * Resume a campaign
   */
  async resumeCampaign(campaignId: number): Promise<void> {
    const campaign = await storage.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.status !== "paused") {
      throw new Error("Campaign can only be resumed from paused status");
    }

    await storage.updateCampaign(campaignId, {
      status: "scheduled",
    });
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(campaignId: number): Promise<Campaign | undefined> {
    return await storage.getCampaignById(campaignId);
  }

  /**
   * Get all campaigns for a user
   */
  async getUserCampaigns(userId: string): Promise<Campaign[]> {
    return await storage.getCampaignsByUser(userId);
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: number): Promise<CampaignStats> {
    const stats = await storage.getCampaignStats(campaignId);
    
    const successRate = stats.total > 0 ? (stats.sent / stats.total) * 100 : 0;

    return {
      ...stats,
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  /**
   * Get campaign progress
   */
  async getCampaignProgress(campaignId: number): Promise<CampaignProgress> {
    const campaign = await storage.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const stats = await this.getCampaignStats(campaignId);
         const totalTargets = campaign.totalTargets || 0;
     const progress = totalTargets > 0 ? (stats.sent / totalTargets) * 100 : 0;

     // Calculate estimated completion
     const scheduling = campaign.scheduling as CampaignScheduling;
     const remainingMessages = totalTargets - stats.sent;
     const totalDelaySeconds = remainingMessages * scheduling.delayBetweenMessages;
     const estimatedCompletion = new Date(Date.now() + totalDelaySeconds * 1000);

     // Calculate next message time
     const nextMessageTime = new Date(Date.now() + scheduling.delayBetweenMessages * 1000);

     return {
       campaignId: campaign.id,
       status: campaign.status || "draft",
       totalTargets,
       sentCount: stats.sent,
       failedCount: stats.failed,
       progress: Math.round(progress * 100) / 100,
       estimatedCompletion: estimatedCompletion.toISOString(),
       nextMessageTime: nextMessageTime.toISOString(),
     };
  }

  /**
   * Delete a campaign
   */
  async deleteCampaign(campaignId: number): Promise<void> {
    const campaign = await storage.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

         if (["running", "scheduled"].includes(campaign.status || "")) {
      throw new Error("Cannot delete running or scheduled campaign");
    }

    await storage.deleteCampaign(campaignId);
  }

  /**
   * Search campaigns by keyword
   */
  async searchCampaigns(userId: string, keyword: string): Promise<Campaign[]> {
    return await storage.searchCampaigns(userId, keyword);
  }

  /**
   * Get campaigns by status
   */
  async getCampaignsByStatus(userId: string, status: string): Promise<Campaign[]> {
    const campaigns = await storage.getCampaignsByUser(userId);
    return campaigns.filter((campaign: any) => campaign.status === status);
  }

  /**
   * Get user campaign statistics
   */
  async getUserCampaignStats(userId: string) {
    const campaigns = await storage.getCampaignsByUser(userId);
    
    const stats = {
      total: campaigns.length,
      draft: campaigns.filter((c: any) => c.status === "draft").length,
      scheduled: campaigns.filter((c: any) => c.status === "scheduled").length,
      running: campaigns.filter((c: any) => c.status === "running").length,
      paused: campaigns.filter((c: any) => c.status === "paused").length,
      completed: campaigns.filter((c: any) => c.status === "completed").length,
      failed: campaigns.filter((c: any) => c.status === "failed").length,
      totalTargets: campaigns.reduce((sum: number, c: any) => sum + (c.totalTargets || 0), 0),
      totalSent: campaigns.reduce((sum: number, c: any) => sum + (c.sentCount || 0), 0),
      totalFailed: campaigns.reduce((sum: number, c: any) => sum + (c.failedCount || 0), 0),
    };

    return {
      ...stats,
      successRate: stats.totalTargets > 0 ? (stats.totalSent / stats.totalTargets) * 100 : 0,
    };
  }

  /**
   * Check if user can create more campaigns
   */
  async canCreateCampaign(userId: string): Promise<{ canCreate: boolean; reason?: string }> {
    // Check if user has Instagram accounts
    const accounts = await storage.getInstagramAccountsByUser(userId);
    if (accounts.length === 0) {
      return {
        canCreate: false,
        reason: "No Instagram accounts available. Please add accounts first.",
      };
    }

    // Check if user has healthy accounts
    const healthyAccounts = await storage.getHealthyAccounts(userId, 50);
    if (healthyAccounts.length === 0) {
      return {
        canCreate: false,
        reason: "No healthy Instagram accounts available. Please check account health.",
      };
    }

    // Check daily message limits
    const messagesSentToday = await storage.getUserMessagesSentToday(userId);
    if (messagesSentToday >= 150) {
      return {
        canCreate: false,
        reason: "Daily message limit reached. Try again tomorrow.",
      };
    }

    return { canCreate: true };
  }

  /**
   * Get campaign recommendations
   */
  async getCampaignRecommendations(userId: string) {
    const accounts = await storage.getInstagramAccountsByUser(userId);
    const healthyAccounts = await storage.getHealthyAccounts(userId, 50);
    const messagesSentToday = await storage.getUserMessagesSentToday(userId);

    const recommendations = {
      maxMessagesPerDay: Math.min(150 - messagesSentToday, 100),
      delayBetweenMessages: 30,
      accountRotation: "round-robin" as const,
      accountCount: healthyAccounts.length,
      canStartImmediately: healthyAccounts.length > 0 && messagesSentToday < 150,
    };

    return recommendations;
  }
}

export const campaignService = new CampaignService();
