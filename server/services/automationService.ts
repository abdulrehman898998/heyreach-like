import { storage } from "../storage";
import { InstagramBot } from "../automation/instagramBot";
import type { Campaign, InstagramAccount, CampaignLead } from "@shared/schema";

class AutomationService {
  private runningCampaigns = new Map<number, { abort: () => void }>();

  async startCampaign(campaignId: number) {
    if (this.runningCampaigns.has(campaignId)) {
      throw new Error("Campaign is already running");
    }

    const campaign = await storage.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Update campaign status to running
    await storage.updateCampaign(campaignId, { status: "running" });

    // Get campaign leads
    const leads = await storage.getCampaignLeadsByCampaign(campaignId);
    if (leads.length === 0) {
      throw new Error("No leads found for campaign");
    }

    // Get Instagram accounts for this campaign
    const accounts = await storage.getInstagramAccountsByUser(campaign.userId);
    const availableAccounts = accounts.filter(acc => acc.isActive && acc.isHealthy);
    
    if (availableAccounts.length === 0) {
      throw new Error("No healthy Instagram accounts available");
    }

    // Create abort controller
    const abortController = new AbortController();
    this.runningCampaigns.set(campaignId, {
      abort: () => abortController.abort()
    });

    // Start processing leads in background
    this.processLeads(campaign, leads, availableAccounts, abortController.signal)
      .catch(error => {
        console.error(`Campaign ${campaignId} error:`, error);
      })
      .finally(() => {
        this.runningCampaigns.delete(campaignId);
      });
  }

  async stopCampaign(campaignId: number) {
    const running = this.runningCampaigns.get(campaignId);
    if (running) {
      running.abort();
      await storage.updateCampaign(campaignId, { status: "paused" });
    }
  }

  private async processLeads(
    campaign: Campaign, 
    leads: CampaignLead[], 
    accounts: InstagramAccount[], 
    abortSignal: AbortSignal
  ) {
    let accountIndex = 0;
    
    for (const lead of leads) {
      if (abortSignal.aborted) break;

      try {
        // Get current account (rotate through accounts)
        const account = accounts[accountIndex % accounts.length];
        accountIndex++;

        // Create Instagram bot instance
        const bot = new InstagramBot(account.username, account.password);

        // Send message
        await bot.sendMessage(lead.profileUrl, lead.message);

        // Update lead status
        await storage.updateCampaignLead(lead.id, {
          status: "sent",
          sentAt: new Date()
        });

        // Add delay between messages (rate limiting)
        await this.delay(5000 + Math.random() * 5000); // 5-10 seconds

      } catch (error) {
        console.error(`Failed to send message to ${lead.profileUrl}:`, error);
        
        // Update lead status to failed
        await storage.updateCampaignLead(lead.id, {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    // Update campaign status to completed
    await storage.updateCampaign(campaign.id, { status: "completed" });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isRunning(campaignId: number): boolean {
    return this.runningCampaigns.has(campaignId);
  }

  getRunningCampaigns(): number[] {
    return Array.from(this.runningCampaigns.keys());
  }
}

export const automationService = new AutomationService();