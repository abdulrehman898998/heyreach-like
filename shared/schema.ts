import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Platform enum
export const platformEnum = pgEnum("platform", ["instagram", "facebook"]);

// Campaign status enum
export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "running",
  "paused",
  "completed",
  "failed",
]);

// Message status enum
export const messageStatusEnum = pgEnum("message_status", [
  "pending",
  "sent",
  "failed",
  "replied",
]);

// Reply sentiment enum
export const replySentimentEnum = pgEnum("reply_sentiment", [
  "positive",
  "negative",
  "neutral",
]);

// Social media accounts
export const socialAccounts = pgTable("social_accounts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform: platformEnum("platform").notNull(),
  username: varchar("username").notNull(),
  password: text("password").notNull(), // encrypted
  twofa: text("twofa"), // 2FA secret if available
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Google Sheets configurations
export const googleSheets = pgTable("google_sheets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  sheetUrl: text("sheet_url").notNull(),
  accessToken: text("access_token"), // OAuth token
  refreshToken: text("refresh_token"),
  range: varchar("range").default("A:Z"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Campaigns
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  platform: platformEnum("platform").notNull(),
  status: campaignStatusEnum("status").default("draft"),
  googleSheetId: integer("google_sheet_id").references(() => googleSheets.id),
  messagesPerAccount: integer("messages_per_account").default(50),
  delayBetweenMessages: integer("delay_between_messages").default(30), // seconds
  totalTargets: integer("total_targets").default(0),
  messagesSent: integer("messages_sent").default(0),
  repliesReceived: integer("replies_received").default(0),
  positiveReplies: integer("positive_replies").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Campaign targets (from Google Sheets)
export const campaignTargets = pgTable("campaign_targets", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  profileUrl: text("profile_url").notNull(),
  customMessage: text("custom_message"),
  processed: boolean("processed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages sent
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  socialAccountId: integer("social_account_id").notNull().references(() => socialAccounts.id),
  targetId: integer("target_id").notNull().references(() => campaignTargets.id),
  content: text("content").notNull(),
  status: messageStatusEnum("status").default("pending"),
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Replies received
export const replies = pgTable("replies", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  sentiment: replySentimentEnum("sentiment").default("neutral"),
  senderUsername: varchar("sender_username"),
  receivedAt: timestamp("received_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity logs
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action").notNull(),
  details: text("details"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  socialAccounts: many(socialAccounts),
  campaigns: many(campaigns),
  googleSheets: many(googleSheets),
  activityLogs: many(activityLogs),
}));

export const socialAccountsRelations = relations(socialAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [socialAccounts.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const googleSheetsRelations = relations(googleSheets, ({ one, many }) => ({
  user: one(users, {
    fields: [googleSheets.userId],
    references: [users.id],
  }),
  campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, {
    fields: [campaigns.userId],
    references: [users.id],
  }),
  googleSheet: one(googleSheets, {
    fields: [campaigns.googleSheetId],
    references: [googleSheets.id],
  }),
  targets: many(campaignTargets),
  messages: many(messages),
}));

export const campaignTargetsRelations = relations(campaignTargets, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [campaignTargets.campaignId],
    references: [campaigns.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [messages.campaignId],
    references: [campaigns.id],
  }),
  socialAccount: one(socialAccounts, {
    fields: [messages.socialAccountId],
    references: [socialAccounts.id],
  }),
  target: one(campaignTargets, {
    fields: [messages.targetId],
    references: [campaignTargets.id],
  }),
  replies: many(replies),
}));

export const repliesRelations = relations(replies, ({ one }) => ({
  message: one(messages, {
    fields: [replies.messageId],
    references: [messages.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type SocialAccount = typeof socialAccounts.$inferSelect;
export type InsertSocialAccount = typeof socialAccounts.$inferInsert;

export type GoogleSheet = typeof googleSheets.$inferSelect;
export type InsertGoogleSheet = typeof googleSheets.$inferInsert;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

export type CampaignTarget = typeof campaignTargets.$inferSelect;
export type InsertCampaignTarget = typeof campaignTargets.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export type Reply = typeof replies.$inferSelect;
export type InsertReply = typeof replies.$inferInsert;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;

// Schemas
export const insertSocialAccountSchema = createInsertSchema(socialAccounts).omit({
  id: true,
  createdAt: true,
  lastUsed: true,
});

export const insertGoogleSheetSchema = createInsertSchema(googleSheets).omit({
  id: true,
  createdAt: true,
  accessToken: true,
  refreshToken: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  messagesSent: true,
  repliesReceived: true,
  positiveReplies: true,
  startedAt: true,
  completedAt: true,
});

export const insertReplySchema = createInsertSchema(replies).omit({
  id: true,
  createdAt: true,
  receivedAt: true,
});
