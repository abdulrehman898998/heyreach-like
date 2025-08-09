import { storage } from "../storage";
import { generateMessage } from "@shared/schema";
import type { Campaign, InstagramAccount, CampaignLead, Lead } from "@shared/schema";

/**
 * Main execution engine for outreach campaigns
 * Handles scheduling, rate limiting, and message sending automation
 */
export class CampaignExecutionEngine {
  private runningCampaigns = new Map<number, { abort: () => void }>();
  private dailyMessageCounts = new Map<string, { date: string; count: number }>();

  /**
   * Start a campaign with scheduling and rate limiting
   */
  async startCampaign(campaignId: number): Promise<void> {
    if (this.runningCampaigns.has(campaignId)) {
      throw new Error("Campaign is already running");
    }

    const campaign = await storage.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Update campaign status to running
    await storage.updateCampaign(campaignId, { status: "running" });

    // Get all leads for this campaign
    const campaignLeads = await storage.getCampaignLeadsByCampaign(campaignId);
    if (campaignLeads.length === 0) {
      throw new Error("No leads found for campaign. Please add leads first.");
    }

    // Get user's Instagram accounts
    const accounts = await storage.getInstagramAccountsByUser(campaign.userId!);
    const activeAccounts = accounts.filter(acc => acc.isActive && (acc.healthScore || 0) > 50);
    
    if (activeAccounts.length === 0) {
      throw new Error("No healthy Instagram accounts available");
    }

    // Create abort controller for campaign cancellation
    const abortController = new AbortController();
    this.runningCampaigns.set(campaignId, {
      abort: () => abortController.abort()
    });

    // Start processing campaign leads
    this.processCampaignLeads(campaign, campaignLeads, activeAccounts, abortController.signal)
      .catch(error => {
        console.error(`Campaign ${campaignId} error:`, error);
        storage.updateCampaign(campaignId, { status: "failed" });
      })
      .finally(() => {
        this.runningCampaigns.delete(campaignId);
      });

    console.log(`Started campaign ${campaignId} with ${campaignLeads.length} leads`);
  }

  /**
   * Stop a running campaign
   */
  async stopCampaign(campaignId: number): Promise<void> {
    const running = this.runningCampaigns.get(campaignId);
    if (running) {
      running.abort();
      await storage.updateCampaign(campaignId, { status: "paused" });
      console.log(`Stopped campaign ${campaignId}`);
    }
  }

  /**
   * Process all leads in a campaign with proper scheduling and rate limiting
   */
  private async processCampaignLeads(
    campaign: Campaign,
    campaignLeads: CampaignLead[],
    accounts: InstagramAccount[],
    abortSignal: AbortSignal
  ): Promise<void> {
    const scheduling = campaign.scheduling as any;
    const maxMessagesPerDay = scheduling.maxMessagesPerDay || 50;
    const delayBetweenMessages = (scheduling.delayBetweenMessages || 30) * 1000; // Convert to ms
    
    let accountIndex = 0;
    let processedCount = 0;
    let failedCount = 0;

    console.log(`Processing ${campaignLeads.length} leads for campaign ${campaign.id}`);

    for (const campaignLead of campaignLeads) {
      if (abortSignal.aborted) {
        console.log(`Campaign ${campaign.id} aborted`);
        break;
      }

      try {
        // Select account with round-robin rotation
        const account = accounts[accountIndex % accounts.length];
        accountIndex++;

        // Check daily message limit for this account
        if (!this.canSendMessage(account, maxMessagesPerDay)) {
          console.log(`Account ${account.username} has reached daily limit`);
          continue;
        }

        // Get the actual lead data
        const lead = await storage.getLeadById(campaignLead.leadId!);
        if (!lead) {
          console.error(`Lead ${campaignLead.leadId} not found`);
          continue;
        }

        // Send the message
        const success = await this.sendMessage(campaignLead, lead, account);
        
        if (success) {
          processedCount++;
          this.incrementDailyCount(account);
          
          // Update campaign lead status
          await storage.updateCampaignLead(campaignLead.id, {
            status: "sent",
            sentAt: new Date(),
            accountId: account.id
          });
          
          console.log(`Sent message to ${lead.profileUrl} using account ${account.username}`);
        } else {
          failedCount++;
          await storage.updateCampaignLead(campaignLead.id, {
            status: "failed",
            errorMessage: "Failed to send message",
            accountId: account.id
          });
        }

        // Update campaign stats
        await storage.updateCampaign(campaign.id, {
          sentCount: processedCount,
          failedCount: failedCount
        });

        // Wait between messages to avoid rate limiting
        if (delayBetweenMessages > 0) {
          await this.sleep(delayBetweenMessages);
        }

      } catch (error) {
        console.error(`Error processing lead ${campaignLead.id}:`, error);
        failedCount++;
        
        await storage.updateCampaignLead(campaignLead.id, {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    // Mark campaign as completed
    await storage.updateCampaign(campaign.id, { 
      status: "completed",
      sentCount: processedCount,
      failedCount: failedCount
    });

    console.log(`Campaign ${campaign.id} completed. Sent: ${processedCount}, Failed: ${failedCount}`);
  }

  /**
   * Send a message to a specific lead using an Instagram account
   */
  private async sendMessage(
    campaignLead: CampaignLead,
    lead: Lead,
    account: InstagramAccount
  ): Promise<boolean> {
    try {
      // Generate message with dynamic data
      const leadData = {
        ...lead.customFields as Record<string, string>,
        name: lead.name || "there",
        profileUrl: lead.profileUrl
      };

      const message = generateMessage(campaignLead.messageContent, leadData);
      
      console.log(`Sending message to ${lead.profileUrl}:`);
      console.log(`Message: ${message}`);
      console.log(`Using account: ${account.username}`);

      // In a real implementation, this would:
      // 1. Navigate to the Instagram profile URL
      // 2. Send the direct message
      // 3. Handle Instagram's anti-bot measures
      
      // For now, simulate the message sending
      await this.simulateMessageSending(lead.profileUrl, message, account.username);
      
      // Update account's last used timestamp
      await storage.updateInstagramAccount(account.id, {
        lastUsed: new Date()
      });

      return true;
    } catch (error) {
      console.error(`Failed to send message:`, error);
      return false;
    }
  }

  /**
   * Simulate the message sending process
   * In production, this would integrate with Instagram automation tools
   */
  private async simulateMessageSending(
    profileUrl: string,
    message: string,
    username: string
  ): Promise<void> {
    // Simulate navigation and message sending delay
    await this.sleep(2000 + Math.random() * 3000); // 2-5 seconds
    
    console.log(`[AUTOMATION] Account @${username} navigated to ${profileUrl}`);
    console.log(`[AUTOMATION] Sent message: "${message.substring(0, 50)}..."`);
    
    // Log the automation action (you could store this in database for tracking)
    console.log(`[SUCCESS] Message sent successfully`);
  }

  /**
   * Check if account can send more messages today
   */
  private canSendMessage(account: InstagramAccount, maxPerDay: number): boolean {
    const today = new Date().toDateString();
    const key = `${account.id}-${today}`;
    const dailyData = this.dailyMessageCounts.get(key);
    
    if (!dailyData || dailyData.date !== today) {
      return true;
    }
    
    return dailyData.count < maxPerDay;
  }

  /**
   * Increment daily message count for an account
   */
  private incrementDailyCount(account: InstagramAccount): void {
    const today = new Date().toDateString();
    const key = `${account.id}-${today}`;
    const current = this.dailyMessageCounts.get(key);
    
    if (!current || current.date !== today) {
      this.dailyMessageCounts.set(key, { date: today, count: 1 });
    } else {
      this.dailyMessageCounts.set(key, { date: today, count: current.count + 1 });
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get status of all running campaigns
   */
  getRunningCampaigns(): number[] {
    return Array.from(this.runningCampaigns.keys());
  }

  /**
   * Schedule a campaign to start at a specific time
   */
  async scheduleCampaign(campaignId: number, startTime: Date): Promise<void> {
    const delay = startTime.getTime() - Date.now();
    
    if (delay <= 0) {
      // Start immediately
      await this.startCampaign(campaignId);
      return;
    }

    console.log(`Campaign ${campaignId} scheduled to start in ${Math.round(delay / 1000)} seconds`);
    
    setTimeout(async () => {
      try {
        await this.startCampaign(campaignId);
      } catch (error) {
        console.error(`Failed to start scheduled campaign ${campaignId}:`, error);
      }
    }, delay);
  }
}

// Export singleton instance
export const campaignExecutionEngine = new CampaignExecutionEngine();