import {
  users,
  socialAccounts,
  googleSheets,
  campaigns,
  campaignTargets,
  messages,
  replies,
  activityLogs,
  type User,
  type UpsertUser,
  type SocialAccount,
  type InsertSocialAccount,
  type GoogleSheet,
  type InsertGoogleSheet,
  type Campaign,
  type InsertCampaign,
  type CampaignTarget,
  type InsertCampaignTarget,
  type Message,
  type InsertMessage,
  type Reply,
  type InsertReply,
  type ActivityLog,
  type InsertActivityLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count, sum } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Social accounts
  createSocialAccount(account: InsertSocialAccount): Promise<SocialAccount>;
  getSocialAccountsByUser(userId: string): Promise<SocialAccount[]>;
  updateSocialAccount(id: number, updates: Partial<SocialAccount>): Promise<SocialAccount>;
  deleteSocialAccount(id: number): Promise<void>;

  // Google Sheets
  createGoogleSheet(sheet: InsertGoogleSheet): Promise<GoogleSheet>;
  getGoogleSheetsByUser(userId: string): Promise<GoogleSheet[]>;
  getGoogleSheet(id: number): Promise<GoogleSheet | undefined>;
  updateGoogleSheet(id: number, updates: Partial<GoogleSheet>): Promise<GoogleSheet>;
  deleteGoogleSheet(id: number): Promise<void>;

  // Campaigns
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  getCampaignsByUser(userId: string): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign>;
  deleteCampaign(id: number): Promise<void>;

  // Campaign targets
  createCampaignTargets(targets: InsertCampaignTarget[]): Promise<CampaignTarget[]>;
  getCampaignTargets(campaignId: number): Promise<CampaignTarget[]>;

  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByCampaign(campaignId: number): Promise<Message[]>;
  updateMessage(id: number, updates: Partial<Message>): Promise<Message>;

  // Replies
  createReply(reply: InsertReply): Promise<Reply>;
  getRepliesByMessage(messageId: number): Promise<Reply[]>;

  // Activity logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogsByUser(userId: string, limit?: number): Promise<ActivityLog[]>;

  // Analytics
  getUserStats(userId: string): Promise<{
    totalMessagesSent: number;
    totalRepliesReceived: number;
    totalPositiveReplies: number;
    activeCampaigns: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Social accounts
  async createSocialAccount(account: InsertSocialAccount): Promise<SocialAccount> {
    const [created] = await db.insert(socialAccounts).values(account).returning();
    return created;
  }

  async getSocialAccountsByUser(userId: string): Promise<SocialAccount[]> {
    return await db
      .select()
      .from(socialAccounts)
      .where(eq(socialAccounts.userId, userId))
      .orderBy(desc(socialAccounts.createdAt));
  }

  async updateSocialAccount(id: number, updates: Partial<SocialAccount>): Promise<SocialAccount> {
    const [updated] = await db
      .update(socialAccounts)
      .set(updates)
      .where(eq(socialAccounts.id, id))
      .returning();
    return updated;
  }

  async deleteSocialAccount(id: number): Promise<void> {
    await db.delete(socialAccounts).where(eq(socialAccounts.id, id));
  }

  // Google Sheets
  async createGoogleSheet(sheet: InsertGoogleSheet): Promise<GoogleSheet> {
    const [created] = await db.insert(googleSheets).values(sheet).returning();
    return created;
  }

  async getGoogleSheetsByUser(userId: string): Promise<GoogleSheet[]> {
    return await db
      .select()
      .from(googleSheets)
      .where(eq(googleSheets.userId, userId))
      .orderBy(desc(googleSheets.createdAt));
  }

  async getGoogleSheet(id: number): Promise<GoogleSheet | undefined> {
    const [sheet] = await db.select().from(googleSheets).where(eq(googleSheets.id, id));
    return sheet;
  }

  async updateGoogleSheet(id: number, updates: Partial<GoogleSheet>): Promise<GoogleSheet> {
    const [updated] = await db
      .update(googleSheets)
      .set(updates)
      .where(eq(googleSheets.id, id))
      .returning();
    return updated;
  }

  async deleteGoogleSheet(id: number): Promise<void> {
    await db.delete(googleSheets).where(eq(googleSheets.id, id));
  }

  // Campaigns
  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [created] = await db.insert(campaigns).values(campaign).returning();
    return created;
  }

  async getCampaignsByUser(userId: string): Promise<Campaign[]> {
    return await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.userId, userId))
      .orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign> {
    const [updated] = await db
      .update(campaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    return updated;
  }

  async deleteCampaign(id: number): Promise<void> {
    await db.delete(campaigns).where(eq(campaigns.id, id));
  }

  // Campaign targets
  async createCampaignTargets(targets: InsertCampaignTarget[]): Promise<CampaignTarget[]> {
    if (targets.length === 0) return [];
    return await db.insert(campaignTargets).values(targets).returning();
  }

  async getCampaignTargets(campaignId: number): Promise<CampaignTarget[]> {
    return await db
      .select()
      .from(campaignTargets)
      .where(eq(campaignTargets.campaignId, campaignId))
      .orderBy(campaignTargets.id);
  }

  // Messages
  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  async getMessagesByCampaign(campaignId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.campaignId, campaignId))
      .orderBy(desc(messages.createdAt));
  }

  async updateMessage(id: number, updates: Partial<Message>): Promise<Message> {
    const [updated] = await db
      .update(messages)
      .set(updates)
      .where(eq(messages.id, id))
      .returning();
    return updated;
  }

  // Replies
  async createReply(reply: InsertReply): Promise<Reply> {
    const [created] = await db.insert(replies).values(reply).returning();
    return created;
  }

  async getRepliesByMessage(messageId: number): Promise<Reply[]> {
    return await db
      .select()
      .from(replies)
      .where(eq(replies.messageId, messageId))
      .orderBy(desc(replies.createdAt));
  }

  // Activity logs
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [created] = await db.insert(activityLogs).values(log).returning();
    return created;
  }

  async getActivityLogsByUser(userId: string, limit = 50): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  // Analytics
  async getUserStats(userId: string): Promise<{
    totalMessagesSent: number;
    totalRepliesReceived: number;
    totalPositiveReplies: number;
    activeCampaigns: number;
  }> {
    // Get total messages sent
    const messageStats = await db
      .select({ count: count() })
      .from(messages)
      .innerJoin(campaigns, eq(campaigns.id, messages.campaignId))
      .where(and(eq(campaigns.userId, userId), eq(messages.status, 'sent')));

    // Get total replies
    const replyStats = await db
      .select({ count: count() })
      .from(replies)
      .innerJoin(messages, eq(messages.id, replies.messageId))
      .innerJoin(campaigns, eq(campaigns.id, messages.campaignId))
      .where(eq(campaigns.userId, userId));

    // Get positive replies
    const positiveReplyStats = await db
      .select({ count: count() })
      .from(replies)
      .innerJoin(messages, eq(messages.id, replies.messageId))
      .innerJoin(campaigns, eq(campaigns.id, messages.campaignId))
      .where(and(eq(campaigns.userId, userId), eq(replies.sentiment, 'positive')));

    // Get active campaigns
    const activeCampaignStats = await db
      .select({ count: count() })
      .from(campaigns)
      .where(and(eq(campaigns.userId, userId), eq(campaigns.status, 'running')));

    return {
      totalMessagesSent: messageStats[0]?.count || 0,
      totalRepliesReceived: replyStats[0]?.count || 0,
      totalPositiveReplies: positiveReplyStats[0]?.count || 0,
      activeCampaigns: activeCampaignStats[0]?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
