import { v4 as uuidv4 } from "uuid";
import {
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
  generateMessage,
} from "@shared/schema";

// Simple in-memory storage for demo/testing
export class MemoryStorage {
  users: User[] = [];
  accounts: InstagramAccount[] = [];
  leadFiles: LeadFile[] = [];
  leads: Lead[] = [];
  templates: Template[] = [];
  campaigns: Campaign[] = [];
  campaignLeads: CampaignLead[] = [];

  private leadFileId = 1;
  private leadId = 1;
  private templateId = 1;
  private campaignId = 1;
  private accountId = 1;
  private campaignLeadId = 1;

  constructor() {
    // Seed one demo user
    const demoUser: User = {
      id: uuidv4(),
      email: "demo@example.com",
      name: "Demo User",
      password: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(demoUser);
  }

  // User ops
  async createUser(userData: NewUser): Promise<User> {
    const user: User = { ...userData, id: userData.id || (uuidv4() as any), createdAt: new Date(), updatedAt: new Date() } as User;
    this.users.push(user);
    return user;
  }
  async getUserById(id: string): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }
  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.users.find(u => u.email === email);
  }

  // Instagram accounts
  async createInstagramAccount(data: NewInstagramAccount): Promise<InstagramAccount> {
    const account: InstagramAccount = {
      id: this.accountId++,
      userId: data.userId!,
      username: data.username!,
      password: data.password!,
      healthScore: data.healthScore ?? 100,
      isActive: data.isActive ?? true,
      lastUsed: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    this.accounts.push(account);
    return account;
  }
  async getInstagramAccountsByUser(userId: string): Promise<InstagramAccount[]> {
    return this.accounts.filter(a => a.userId === userId);
  }
  async getInstagramAccountById(id: number): Promise<InstagramAccount | undefined> {
    return this.accounts.find(a => a.id === id);
  }
  async updateInstagramAccount(id: number, updates: Partial<InstagramAccount>): Promise<InstagramAccount> {
    const acc = this.accounts.find(a => a.id === id)!;
    Object.assign(acc, updates, { updatedAt: new Date() });
    return acc;
  }

  // Lead files
  async createLeadFile(data: NewLeadFile): Promise<LeadFile> {
    const lf: LeadFile = {
      id: this.leadFileId++,
      userId: data.userId!,
      filename: data.filename!,
      totalRows: data.totalRows!,
      columnMapping: data.columnMapping as any,
      uploadedAt: new Date(),
    } as any;
    this.leadFiles.push(lf);
    return lf;
  }
  async getLeadFilesByUser(userId: string): Promise<LeadFile[]> {
    return this.leadFiles.filter(f => f.userId === userId);
  }
  async getLeadFileById(id: number): Promise<LeadFile | undefined> {
    return this.leadFiles.find(f => f.id === id);
  }
  async deleteLeadFile(fileId: number): Promise<void> {
    this.leads = this.leads.filter(l => l.fileId !== fileId);
    this.leadFiles = this.leadFiles.filter(f => f.id !== fileId);
  }

  // Leads
  async createLeads(data: NewLead[]): Promise<Lead[]> {
    const created: Lead[] = data.map(d => ({
      id: this.leadId++,
      fileId: d.fileId!,
      profileUrl: d.profileUrl!,
      name: (d as any).name ?? null,
      customFields: d.customFields ?? {},
      createdAt: new Date(),
    } as any));
    this.leads.push(...created);
    return created;
  }
  async getLeadsByFile(fileId: number): Promise<Lead[]> {
    return this.leads.filter(l => l.fileId === fileId);
  }
  async getLeadsByFileWithPagination(fileId: number, offset = 0, limit = 10): Promise<Lead[]> {
    const all = await this.getLeadsByFile(fileId);
    return all.slice(offset, offset + limit);
  }
  async getLeadCountByFile(fileId: number): Promise<number> {
    return (await this.getLeadsByFile(fileId)).length;
  }

  // Templates
  async createTemplate(data: NewTemplate): Promise<Template> {
    const t: Template = {
      id: this.templateId++,
      userId: data.userId!,
      name: data.name!,
      content: data.content!,
      variables: data.variables ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    this.templates.push(t);
    return t;
  }
  async getTemplatesByUser(userId: string): Promise<Template[]> {
    return this.templates.filter(t => t.userId === userId);
  }
  async getTemplateById(id: number): Promise<Template | undefined> {
    return this.templates.find(t => t.id === id);
  }
  async updateTemplate(id: number, updates: Partial<Template>): Promise<Template> {
    const t = this.templates.find(t => t.id === id)!;
    Object.assign(t, updates, { updatedAt: new Date() });
    return t;
  }
  async deleteTemplate(id: number): Promise<void> {
    this.templates = this.templates.filter(t => t.id !== id);
  }
  async searchTemplates(userId: string, keyword: string): Promise<Template[]> {
    return (await this.getTemplatesByUser(userId)).filter(t => t.name.toLowerCase().includes(keyword.toLowerCase()));
  }

  // Campaigns
  async createCampaign(data: NewCampaign): Promise<Campaign> {
    const c: Campaign = {
      id: this.campaignId++,
      userId: data.userId!,
      name: data.name!,
      templateId: data.templateId!,
      leadFileId: data.leadFileId!,
      status: (data as any).status ?? "draft",
      scheduling: data.scheduling as any,
      totalTargets: 0,
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    this.campaigns.push(c);
    return c;
  }
  async getCampaignsByUser(userId: string): Promise<Campaign[]> {
    return this.campaigns.filter(c => c.userId === userId);
  }
  async getCampaignById(id: number): Promise<Campaign | undefined> {
    return this.campaigns.find(c => c.id === id);
  }
  async updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign> {
    const c = this.campaigns.find(c => c.id === id)!;
    Object.assign(c, updates, { updatedAt: new Date() });
    return c;
  }
  async deleteCampaign(id: number): Promise<void> {
    this.campaignLeads = this.campaignLeads.filter(cl => cl.campaignId !== id);
    this.campaigns = this.campaigns.filter(c => c.id !== id);
  }

  // Campaign Leads
  async createCampaignLeads(data: NewCampaignLead[]): Promise<CampaignLead[]> {
    const created: CampaignLead[] = data.map(d => ({
      id: this.campaignLeadId++,
      campaignId: d.campaignId!,
      leadId: d.leadId!,
      accountId: d.accountId!,
      messageContent: d.messageContent!,
      status: (d as any).status ?? "pending",
      sentAt: null,
      errorMessage: null,
      createdAt: new Date(),
    } as any));
    this.campaignLeads.push(...created);
    return created;
  }
  async getCampaignLeadsByCampaign(campaignId: number): Promise<CampaignLead[]> {
    return this.campaignLeads.filter(cl => cl.campaignId === campaignId);
  }
  async updateCampaignLead(id: number, updates: Partial<CampaignLead>): Promise<CampaignLead> {
    const cl = this.campaignLeads.find(cl => cl.id === id)!;
    Object.assign(cl, updates);
    return cl;
  }

  // Stats
  async getCampaignStats(campaignId: number): Promise<{ total: number; pending: number; sent: number; delivered: number; failed: number; }> {
    const cls = await this.getCampaignLeadsByCampaign(campaignId);
    const stats = { total: cls.length, pending: 0, sent: 0, delivered: 0, failed: 0 };
    cls.forEach(cl => { (stats as any)[cl.status || "pending"] = ((stats as any)[cl.status || "pending"] || 0) + 1; });
    return stats;
  }

  // Health and limits
  async getHealthyAccounts(userId: string, minHealthScore = 50): Promise<InstagramAccount[]> {
    return (await this.getInstagramAccountsByUser(userId)).filter(a => (a.healthScore ?? 0) >= minHealthScore);
  }
  async getAccountMessagesSentToday(_accountId: number): Promise<number> { return 0; }
  async getUserMessagesSentToday(_userId: string): Promise<number> { return 0; }

  // Message generation
  async generateMessagesForCampaign(campaignId: number): Promise<void> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) throw new Error("Campaign not found");
    const template = await this.getTemplateById(campaign.templateId!);
    if (!template) throw new Error("Template not found");
    const leads = await this.getLeadsByFile(campaign.leadFileId!);
    const accounts = await this.getInstagramAccountsByUser(campaign.userId || '');
    if (accounts.length === 0) throw new Error("No Instagram accounts available");

    const items: NewCampaignLead[] = [];
    let idx = 0;
    for (const lead of leads) {
      const variables = { name: lead.name || "", profile_url: lead.profileUrl, ...(lead.customFields as any) };
      const msg = generateMessage(template.content, variables);
      const account = accounts[idx % accounts.length];
      items.push({ campaignId: campaign.id, leadId: lead.id, accountId: account.id, messageContent: msg, status: "pending" });
      idx++;
    }
    await this.createCampaignLeads(items);
    await this.updateCampaign(campaign.id, { totalTargets: leads.length, status: "scheduled" } as any);
  }
}

export const memoryStorage = new MemoryStorage();
