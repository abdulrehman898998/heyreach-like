import { sql } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  boolean
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Lead files - stores uploaded CSV data
export const leadFiles = pgTable("lead_files", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  columnNames: text("column_names").array().notNull(), // Available columns from CSV
  selectedColumns: text("selected_columns").array().notNull(), // User-selected columns
  rowCount: integer("row_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Leads - individual lead records from CSV
export const leads = pgTable("leads", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  leadFileId: integer("lead_file_id").references(() => leadFiles.id).notNull(),
  profileUrl: varchar("profile_url", { length: 500 }).notNull(),
  message: text("message"),
  data: jsonb("data").notNull(), // All CSV row data as JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Campaigns - outreach campaigns
export const campaigns = pgTable("campaigns", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  profileUrlTemplate: text("profile_url_template").notNull(), // e.g., "{{Profiles}}"
  messageTemplate: text("message_template").notNull(), // e.g., "Hey {{name}}! {{message}}"
  status: varchar("status", { length: 50 }).notNull().default("draft"), // draft, running, completed, paused
  totalLeads: integer("total_leads").notNull().default(0),
  messagesSent: integer("messages_sent").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Campaign executions - track individual message sends
export const campaignExecutions = pgTable("campaign_executions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  campaignId: integer("campaign_id").references(() => campaigns.id).notNull(),
  leadId: integer("lead_id").references(() => leads.id).notNull(),
  profileUrl: varchar("profile_url", { length: 500 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, sent, failed
  sentAt: timestamp("sent_at"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Type exports
export type LeadFile = typeof leadFiles.$inferSelect;
export type InsertLeadFile = typeof leadFiles.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;
export type CampaignExecution = typeof campaignExecutions.$inferSelect;
export type InsertCampaignExecution = typeof campaignExecutions.$inferInsert;

// Zod schemas
export const insertLeadFileSchema = createInsertSchema(leadFiles).omit({ id: true, createdAt: true });
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true });
export const insertCampaignSchema = createInsertSchema(campaigns).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCampaignExecutionSchema = createInsertSchema(campaignExecutions).omit({ id: true, createdAt: true });

export type InsertLeadFileInput = z.infer<typeof insertLeadFileSchema>;
export type InsertLeadInput = z.infer<typeof insertLeadSchema>;
export type InsertCampaignInput = z.infer<typeof insertCampaignSchema>;
export type InsertCampaignExecutionInput = z.infer<typeof insertCampaignExecutionSchema>;