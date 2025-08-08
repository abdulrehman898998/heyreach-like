import 'dotenv/config';
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { memoryStorage } from "./storage.memory";
import { like } from "drizzle-orm";
import * as schema from "../shared/schema.js";
import {
  users,
  instagramAccounts,
  leadFiles,
  leads,
  templates,
  campaigns,
  campaignLeads,
  type User,
  type NewUser,
  type InstagramAccount,
  type NewInstagramAccount,
  type LeadFile,
  type NewLeadFile,
  type Lead,
  type NewLead,
  type Template,
  type NewTemplate,
  type Campaign,
  type NewCampaign,
  type CampaignLead,
  type NewCampaignLead,
  type ColumnMapping,
  type CampaignScheduling,
  extractTemplateVariables,
  generateMessage,
} from "@shared/schema";
import { eq, and, desc, count, gte, lte } from "drizzle-orm";

// Database connection
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/instagram_automation";
const client = postgres(connectionString);
export const db = drizzle(client, { schema });

export class DatabaseStorage {
  // User Management
  async createUser(userData: NewUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  // Instagram Account Management
  async createInstagramAccount(accountData: NewInstagramAccount): Promise<InstagramAccount> {
    const [account] = await db.insert(instagramAccounts).values(accountData).returning();
    return account;
  }

  async getInstagramAccountsByUser(userId: string): Promise<InstagramAccount[]> {
    return await db.select().from(instagramAccounts).where(eq(instagramAccounts.userId, userId));
  }

  async getInstagramAccountById(id: number): Promise<InstagramAccount | undefined> {
    const [account] = await db.select().from(instagramAccounts).where(eq(instagramAccounts.id, id));
    return account;
  }

  async updateInstagramAccount(id: number, updates: Partial<InstagramAccount>): Promise<InstagramAccount> {
    const [account] = await db.update(instagramAccounts).set(updates).where(eq(instagramAccounts.id, id)).returning();
    return account;
  }

  // Lead File Management
  async createLeadFile(fileData: NewLeadFile): Promise<LeadFile> {
    const [file] = await db.insert(leadFiles).values(fileData).returning();
    return file;
  }

  async getLeadFilesByUser(userId: string): Promise<LeadFile[]> {
    return await db.select().from(leadFiles).where(eq(leadFiles.userId, userId)).orderBy(desc(leadFiles.uploadedAt));
  }

  async getLeadFileById(id: number): Promise<LeadFile | undefined> {
    const [file] = await db.select().from(leadFiles).where(eq(leadFiles.id, id));
    return file;
  }

  // Lead Management
  async createLead(leadData: NewLead): Promise<Lead> {
    const [lead] = await db.insert(leads).values(leadData).returning();
    return lead;
  }

  async createLeads(leadsData: NewLead[]): Promise<Lead[]> {
    return await db.insert(leads).values(leadsData).returning();
  }

  async getLeadsByFile(fileId: number): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.fileId, fileId));
  }

  async getLeadsByFileWithPagination(fileId: number, offset: number = 0, limit: number = 10): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.fileId, fileId)).limit(limit).offset(offset);
  }

  async getLeadCountByFile(fileId: number): Promise<number> {
    const [result] = await db.select({ count: count() }).from(leads).where(eq(leads.fileId, fileId));
    return result?.count || 0;
  }

  // Template Management
  async createTemplate(templateData: NewTemplate): Promise<Template> {
    const [template] = await db.insert(templates).values(templateData).returning();
    return template;
  }

  async getTemplatesByUser(userId: string): Promise<Template[]> {
    return await db.select().from(templates).where(eq(templates.userId, userId)).orderBy(desc(templates.createdAt));
  }

  async getTemplateById(id: number): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template;
  }

  async updateTemplate(id: number, updates: Partial<Template>): Promise<Template> {
    const [template] = await db.update(templates).set(updates).where(eq(templates.id, id)).returning();
    return template;
  }

  async deleteTemplate(id: number): Promise<void> {
    await db.delete(templates).where(eq(templates.id, id));
  }

  // Campaign Management
  async createCampaign(campaignData: NewCampaign): Promise<Campaign> {
    const [campaign] = await db.insert(campaigns).values(campaignData).returning();
    return campaign;
  }

  async getCampaignsByUser(userId: string): Promise<Campaign[]> {
    return await db.select().from(campaigns).where(eq(campaigns.userId, userId)).orderBy(desc(campaigns.createdAt));
  }

  async getCampaignById(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign> {
    const [campaign] = await db.update(campaigns).set(updates).where(eq(campaigns.id, id)).returning();
    return campaign;
  }

  // Campaign Lead Management
  async createCampaignLead(campaignLeadData: NewCampaignLead): Promise<CampaignLead> {
    const [campaignLead] = await db.insert(campaignLeads).values(campaignLeadData).returning();
    return campaignLead;
  }

  async createCampaignLeads(campaignLeadsData: NewCampaignLead[]): Promise<CampaignLead[]> {
    return await db.insert(campaignLeads).values(campaignLeadsData).returning();
  }

  async getCampaignLeadsByCampaign(campaignId: number): Promise<CampaignLead[]> {
    return await db.select().from(campaignLeads).where(eq(campaignLeads.campaignId, campaignId));
  }

  async updateCampaignLead(id: number, updates: Partial<CampaignLead>): Promise<CampaignLead> {
    const [campaignLead] = await db.update(campaignLeads).set(updates).where(eq(campaignLeads.id, id)).returning();
    return campaignLead;
  }

  // Campaign Statistics
  async getCampaignStats(campaignId: number): Promise<{
    total: number;
    pending: number;
    sent: number;
    delivered: number;
    failed: number;
  }> {
    const results = await db
      .select({
        status: campaignLeads.status,
        count: count(),
      })
      .from(campaignLeads)
      .where(eq(campaignLeads.campaignId, campaignId))
      .groupBy(campaignLeads.status);

    const stats = {
      total: 0,
      pending: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
    };

    results.forEach((result) => {
      const count = Number(result.count);
      stats.total += count;
      stats[result.status as keyof typeof stats] = count;
    });

    return stats;
  }

  // Message Generation
  async generateMessagesForCampaign(campaignId: number): Promise<void> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) throw new Error("Campaign not found");

         const template = await this.getTemplateById(campaign.templateId || 0);
    if (!template) throw new Error("Template not found");

         const leads = await this.getLeadsByFile(campaign.leadFileId || 0);
    const accounts = await this.getInstagramAccountsByUser(campaign.userId || '');

    if (accounts.length === 0) throw new Error("No Instagram accounts available");

    const campaignLeads: NewCampaignLead[] = [];
    let accountIndex = 0;

    for (const lead of leads) {
             // Prepare variables for message generation
       const variables: Record<string, string> = {
         name: lead.name || "",
         profile_url: lead.profileUrl,
         ...(lead.customFields as Record<string, string>),
       };

      // Generate message content
      const messageContent = generateMessage(template.content, variables);

      // Select account (round-robin)
      const account = accounts[accountIndex % accounts.length];

      campaignLeads.push({
        campaignId: campaign.id,
        leadId: lead.id,
        accountId: account.id,
        messageContent,
        status: "pending",
      });

      accountIndex++;
    }

    // Create campaign leads
    await this.createCampaignLeads(campaignLeads);

    // Update campaign with total targets
    await this.updateCampaign(campaign.id, {
      totalTargets: leads.length,
      status: "scheduled",
    });
  }

  // Account Health Management
  async updateAccountHealth(accountId: number, healthScore: number): Promise<void> {
    await this.updateInstagramAccount(accountId, { healthScore });
  }

  async getHealthyAccounts(userId: string, minHealthScore: number = 50): Promise<InstagramAccount[]> {
    return await db
      .select()
      .from(instagramAccounts)
      .where(and(eq(instagramAccounts.userId, userId), gte(instagramAccounts.healthScore, minHealthScore)));
  }

  // Daily Limits Management
  async getAccountMessagesSentToday(accountId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [result] = await db
      .select({ count: count() })
      .from(campaignLeads)
      .where(
        and(
          eq(campaignLeads.accountId, accountId),
          gte(campaignLeads.sentAt, today)
        )
      );

    return result?.count || 0;
  }

  async getUserMessagesSentToday(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [result] = await db
      .select({ count: count() })
      .from(campaignLeads)
      .innerJoin(campaigns, eq(campaignLeads.campaignId, campaigns.id))
      .where(
        and(
          eq(campaigns.userId, userId),
          gte(campaignLeads.sentAt, today)
        )
      );

    return result?.count || 0;
  }

  // Search and Filter
  async searchTemplates(userId: string, keyword: string): Promise<Template[]> {
    return await db
      .select()
      .from(templates)
      .where(and(eq(templates.userId, userId), like(templates.name, `%${keyword}%`)))
      .orderBy(desc(templates.createdAt));
  }

  async searchCampaigns(userId: string, keyword: string): Promise<Campaign[]> {
    return await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.userId, userId), like(campaigns.name, `%${keyword}%`)))
      .orderBy(desc(campaigns.createdAt));
  }

  // Cleanup and Maintenance
  async deleteLeadFile(fileId: number): Promise<void> {
    // This will cascade delete all leads associated with the file
    await db.delete(leadFiles).where(eq(leadFiles.id, fileId));
  }

  async deleteCampaign(campaignId: number): Promise<void> {
    // This will cascade delete all campaign leads
    await db.delete(campaigns).where(eq(campaigns.id, campaignId));
  }
}

// Use proper database storage
export const storage = new DatabaseStorage();
