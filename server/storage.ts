import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import {
  leadFiles,
  leads,
  campaigns,
  campaignExecutions,
  type LeadFile,
  type Lead,
  type Campaign,
  type InsertLeadFileInput,
  type InsertLeadInput,
  type InsertCampaignInput,
  type InsertCampaignExecutionInput
} from "@shared/schema";

export interface IStorage {
  // Lead Files
  createLeadFile(data: InsertLeadFileInput): Promise<LeadFile>;
  getLeadFiles(): Promise<LeadFile[]>;
  getLeadFile(id: number): Promise<LeadFile | undefined>;
  
  // Leads
  createLead(data: InsertLeadInput): Promise<Lead>;
  getLeadsByFileId(fileId: number): Promise<Lead[]>;
  getLeads(): Promise<Lead[]>;
  
  // Campaigns
  createCampaign(data: InsertCampaignInput): Promise<Campaign>;
  getCampaigns(): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  updateCampaign(id: number, data: Partial<InsertCampaignInput>): Promise<Campaign | undefined>;
  
  // Campaign Executions
  createCampaignExecution(data: InsertCampaignExecutionInput): Promise<void>;
  getCampaignExecutions(campaignId: number): Promise<any[]>;
  
  // Analytics
  getStats(): Promise<{
    totalMessages: number;
    activeCampaigns: number;
    successRate: number;
    totalLeads: number;
  }>;
  
  // Available columns from all uploaded files
  getAvailableColumns(): Promise<string[]>;
}

export class DatabaseStorage implements IStorage {
  async createLeadFile(data: InsertLeadFileInput): Promise<LeadFile> {
    const [leadFile] = await db.insert(leadFiles).values(data).returning();
    return leadFile;
  }

  async getLeadFiles(): Promise<LeadFile[]> {
    return await db.select().from(leadFiles).orderBy(desc(leadFiles.createdAt));
  }

  async getLeadFile(id: number): Promise<LeadFile | undefined> {
    const [leadFile] = await db.select().from(leadFiles).where(eq(leadFiles.id, id));
    return leadFile;
  }

  async createLead(data: InsertLeadInput): Promise<Lead> {
    const [lead] = await db.insert(leads).values(data).returning();
    return lead;
  }

  async getLeadsByFileId(fileId: number): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.leadFileId, fileId));
  }

  async getLeads(): Promise<Lead[]> {
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async createCampaign(data: InsertCampaignInput): Promise<Campaign> {
    const [campaign] = await db.insert(campaigns).values(data).returning();
    return campaign;
  }

  async getCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async updateCampaign(id: number, data: Partial<InsertCampaignInput>): Promise<Campaign | undefined> {
    const [campaign] = await db.update(campaigns)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    return campaign;
  }

  async createCampaignExecution(data: InsertCampaignExecutionInput): Promise<void> {
    await db.insert(campaignExecutions).values(data);
  }

  async getCampaignExecutions(campaignId: number) {
    return await db.select().from(campaignExecutions).where(eq(campaignExecutions.campaignId, campaignId));
  }

  async getStats() {
    const campaignCount = await db.select().from(campaigns);
    const leadCount = await db.select().from(leads);
    const executionCount = await db.select().from(campaignExecutions);
    const successfulExecutions = await db.select().from(campaignExecutions).where(eq(campaignExecutions.status, 'sent'));

    return {
      totalMessages: executionCount.length,
      activeCampaigns: campaignCount.filter(c => c.status === 'running').length,
      successRate: executionCount.length > 0 ? Math.round((successfulExecutions.length / executionCount.length) * 100) : 0,
      totalLeads: leadCount.length
    };
  }

  async getAvailableColumns(): Promise<string[]> {
    const files = await this.getLeadFiles();
    const allColumns = new Set<string>();
    
    files.forEach(file => {
      file.selectedColumns.forEach(col => allColumns.add(col));
    });
    
    return Array.from(allColumns);
  }
}

export const storage = new DatabaseStorage();