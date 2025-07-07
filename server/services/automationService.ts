import { storage } from "../storage";
import { googleSheetsService } from "./googleSheetsService";
import { InstagramBot } from "../automation/instagramBot";
import type { Campaign, SocialAccount, CampaignTarget } from "@shared/schema";

class AutomationService {
  private runningCampaigns = new Map<number, { abort: () => void }>();
  private broadcastFunction?: (userId: string, data: any) => void;

  setBroadcastFunction(fn: (userId: string, data: any) => void) {
    this.broadcastFunction = fn;
  }

  private broadcast(userId: string, data: any) {
    if (this.broadcastFunction) {
      this.broadcastFunction(userId, data);
    }
  }

  async startCampaign(campaignId: number, userId: string) {
    if (this.runningCampaigns.has(campaignId)) {
      throw new Error("Campaign is already running");
    }

    const campaign = await storage.getCampaign(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Get campaign targets from Google Sheets
    await this.loadCampaignTargets(campaign);

    // Get social accounts for this user and platform
    const accounts = await storage.getSocialAccountsByUser(userId);
    const platformAccounts = accounts.filter(
      acc => acc.platform === campaign.platform && acc.isActive
    );

    if (platformAccounts.length === 0) {
      throw new Error(`No active ${campaign.platform} accounts found`);
    }

    // Create abort controller
    const abortController = new AbortController();
    this.runningCampaigns.set(campaignId, {
      abort: () => abortController.abort(),
    });

    // Start automation in background
    this.runAutomation(campaign, platformAccounts, userId, abortController.signal)
      .catch(error => {
        console.error(`Campaign ${campaignId} error:`, error);
        this.broadcast(userId, {
          type: 'campaign_error',
          campaignId,
          error: error.message,
        });
      })
      .finally(() => {
        this.runningCampaigns.delete(campaignId);
      });
  }

  pauseCampaign(campaignId: number) {
    const running = this.runningCampaigns.get(campaignId);
    if (running) {
      running.abort();
      this.runningCampaigns.delete(campaignId);
    }
  }

  private async loadCampaignTargets(campaign: Campaign) {
    if (!campaign.googleSheetId) {
      throw new Error("No Google Sheet configured for campaign");
    }

    const sheet = await storage.getGoogleSheet(campaign.googleSheetId);
    if (!sheet) {
      throw new Error("Google Sheet not found");
    }

    try {
      const data = await googleSheetsService.fetchSheetData(sheet);
      
      // Convert sheet data to campaign targets
      const targets = data.map(row => ({
        campaignId: campaign.id,
        profileUrl: row.profileUrl || row.profile_url || row.url,
        customMessage: row.message || row.customMessage || null,
      })).filter(target => target.profileUrl);

      await storage.createCampaignTargets(targets);
      
      // Update campaign with total targets
      await storage.updateCampaign(campaign.id, {
        totalTargets: targets.length,
      });

      console.log(`Loaded ${targets.length} targets for campaign ${campaign.id}`);
    } catch (error) {
      console.error("Error loading campaign targets:", error);
      throw new Error("Failed to load targets from Google Sheets");
    }
  }

  private async runAutomation(
    campaign: Campaign,
    accounts: SocialAccount[],
    userId: string,
    signal: AbortSignal
  ) {
    const targets = await storage.getCampaignTargets(campaign.id);
    const unprocessedTargets = targets.filter(t => !t.processed);

    if (unprocessedTargets.length === 0) {
      this.broadcast(userId, {
        type: 'campaign_completed',
        campaignId: campaign.id,
      });
      await storage.updateCampaign(campaign.id, {
        status: 'completed',
        completedAt: new Date(),
      });
      return;
    }

    // Shuffle accounts for load distribution
    const shuffledAccounts = [...accounts].sort(() => Math.random() - 0.5);
    
    let currentAccountIndex = 0;
    let messagesPerAccountCount = 0;

    for (const target of unprocessedTargets) {
      if (signal.aborted) {
        console.log(`Campaign ${campaign.id} aborted`);
        break;
      }

      // Switch account if we've reached the limit
      if (messagesPerAccountCount >= campaign.messagesPerAccount) {
        currentAccountIndex = (currentAccountIndex + 1) % shuffledAccounts.length;
        messagesPerAccountCount = 0;
      }

      const account = shuffledAccounts[currentAccountIndex];
      
      try {
        await this.sendMessage(campaign, account, target, userId);
        messagesPerAccountCount++;

        // Update progress
        await storage.updateCampaign(campaign.id, {
          messagesSent: campaign.messagesSent + 1,
        });

        this.broadcast(userId, {
          type: 'message_sent',
          campaignId: campaign.id,
          target: target.profileUrl,
          account: account.username,
        });

        // Delay between messages
        if (campaign.delayBetweenMessages > 0) {
          await new Promise(resolve => 
            setTimeout(resolve, campaign.delayBetweenMessages * 1000)
          );
        }

      } catch (error) {
        console.error(`Failed to send message to ${target.profileUrl}:`, error);
        
        this.broadcast(userId, {
          type: 'message_failed',
          campaignId: campaign.id,
          target: target.profileUrl,
          error: error.message,
        });
      }
    }

    // Mark campaign as completed
    await storage.updateCampaign(campaign.id, {
      status: 'completed',
      completedAt: new Date(),
    });

    this.broadcast(userId, {
      type: 'campaign_completed',
      campaignId: campaign.id,
    });
  }

  private async sendMessage(
    campaign: Campaign,
    account: SocialAccount,
    target: CampaignTarget,
    userId: string
  ) {
    // Create message record
    const message = await storage.createMessage({
      campaignId: campaign.id,
      socialAccountId: account.id,
      targetId: target.id,
      content: target.customMessage || `Hello! I'd like to connect with you.`,
      status: 'pending',
    });

    try {
      if (campaign.platform === 'instagram') {
        const bot = new InstagramBot({
          username: account.username,
          password: Buffer.from(account.password, 'base64').toString(), // Decrypt
          twofa: account.twofa || undefined,
        });

        await bot.initialize();
        await bot.sendDirectMessage(target.profileUrl, message.content);
        await bot.close();
      }
      // TODO: Add Facebook automation

      // Update message as sent
      await storage.updateMessage(message.id, {
        status: 'sent',
        sentAt: new Date(),
      });

      // Mark target as processed
      await storage.updateCampaign(target.campaignId, { processed: true });

      // Update account last used
      await storage.updateSocialAccount(account.id, {
        lastUsed: new Date(),
      });

      // Log activity
      await storage.createActivityLog({
        userId,
        action: 'message_sent',
        details: `Message sent to ${target.profileUrl} via ${account.username}`,
        metadata: { campaignId: campaign.id, messageId: message.id },
      });

    } catch (error) {
      await storage.updateMessage(message.id, {
        status: 'failed',
        errorMessage: error.message,
      });
      throw error;
    }
  }
}

export const automationService = new AutomationService();
