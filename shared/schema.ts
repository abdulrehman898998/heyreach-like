import { pgTable, serial, text, timestamp, integer, boolean, jsonb, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Instagram accounts table
export const instagramAccounts = pgTable("instagram_accounts", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  password: text("password").notNull(),
  healthScore: integer("health_score").default(100),
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Lead files table (CSV uploads)
export const leadFiles = pgTable("lead_files", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  totalRows: integer("total_rows").notNull(),
  columnMapping: jsonb("column_mapping").notNull(), // { profileUrl: "column1", name: "column2", ... }
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Individual leads from uploaded files
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").references(() => leadFiles.id, { onDelete: "cascade" }),
  profileUrl: text("profile_url").notNull(),
  name: text("name"),
  customFields: jsonb("custom_fields").default("{}"), // { column3: "value", column4: "value" }
  createdAt: timestamp("created_at").defaultNow(),
});

// Message templates table
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  content: text("content").notNull(), // "{HI | HEY | HELLO} {{name}}, loved your post!"
  variables: text("variables").array(), // ["name", "profile_url"]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Campaigns table
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  templateId: integer("template_id").references(() => templates.id),
  leadFileId: integer("lead_file_id").references(() => leadFiles.id),
  status: text("status").default("draft"), // draft, scheduled, running, paused, completed, failed
  scheduling: jsonb("scheduling").notNull(), // { startTime, maxMessagesPerDay, delayBetweenMessages }
  totalTargets: integer("total_targets").default(0),
  sentCount: integer("sent_count").default(0),
  failedCount: integer("failed_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Campaign execution tracking
export const campaignLeads = pgTable("campaign_leads", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
  leadId: integer("lead_id").references(() => leads.id),
  accountId: integer("account_id").references(() => instagramAccounts.id),
  messageContent: text("message_content").notNull(),
  status: text("status").default("pending"), // pending, sent, delivered, failed
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  instagramAccounts: many(instagramAccounts),
  leadFiles: many(leadFiles),
  templates: many(templates),
  campaigns: many(campaigns),
}));

export const instagramAccountsRelations = relations(instagramAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [instagramAccounts.userId],
    references: [users.id],
  }),
  campaignLeads: many(campaignLeads),
}));

export const leadFilesRelations = relations(leadFiles, ({ one, many }) => ({
  user: one(users, {
    fields: [leadFiles.userId],
    references: [users.id],
  }),
  leads: many(leads),
  campaigns: many(campaigns),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  file: one(leadFiles, {
    fields: [leads.fileId],
    references: [leadFiles.id],
  }),
  campaignLeads: many(campaignLeads),
}));

export const templatesRelations = relations(templates, ({ one, many }) => ({
  user: one(users, {
    fields: [templates.userId],
    references: [users.id],
  }),
  campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, {
    fields: [campaigns.userId],
    references: [users.id],
  }),
  template: one(templates, {
    fields: [campaigns.templateId],
    references: [templates.id],
  }),
  leadFile: one(leadFiles, {
    fields: [campaigns.leadFileId],
    references: [leadFiles.id],
  }),
  campaignLeads: many(campaignLeads),
}));

export const campaignLeadsRelations = relations(campaignLeads, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignLeads.campaignId],
    references: [campaigns.id],
  }),
  lead: one(leads, {
    fields: [campaignLeads.leadId],
    references: [leads.id],
  }),
  account: one(instagramAccounts, {
    fields: [campaignLeads.accountId],
    references: [instagramAccounts.id],
  }),
}));

// Type definitions for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type InstagramAccount = typeof instagramAccounts.$inferSelect;
export type NewInstagramAccount = typeof instagramAccounts.$inferInsert;

export type LeadFile = typeof leadFiles.$inferSelect;
export type NewLeadFile = typeof leadFiles.$inferInsert;

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;

export type CampaignLead = typeof campaignLeads.$inferSelect;
export type NewCampaignLead = typeof campaignLeads.$inferInsert;

// Additional types for services
export type MessageTemplate = Template;
export type CampaignTarget = Lead;
export type InsertCampaignTarget = NewLead;

// Column mapping interface
export interface ColumnMapping {
  profileUrl: string;
  name?: string;
  customFields: Record<string, string>;
}

// Campaign scheduling interface
export interface CampaignScheduling {
  startTime: string;
  maxMessagesPerDay: number;
  delayBetweenMessages: number;
  accountRotation: "round-robin" | "health-based" | "load-balanced";
}

/**
 * Extract template variables from content (supports both {{variable}} and /column syntax)
 */
export function extractTemplateVariables(content: string): string[] {
  const variables = new Set<string>();
  
  // Extract {{variable}} syntax
  const variableRegex = /\{\{([^}]+)\}\}/g;
  let match;
  while ((match = variableRegex.exec(content)) !== null) {
    variables.add(match[1].trim());
  }
  
  // Extract /column syntax
  const slashRegex = /\/([a-zA-Z0-9_]+)/g;
  while ((match = slashRegex.exec(content)) !== null) {
    variables.add(match[1].trim());
  }
  
  return Array.from(variables);
}

/**
 * Generate message from template with spintax and dynamic fields
 */
export function generateMessage(template: string, data: Record<string, string>): string {
  let result = template;
  
  // Handle spintax variations {option1 | option2 | option3}
  const spintaxRegex = /\{([^}]+)\}/g;
  result = result.replace(spintaxRegex, (match, options) => {
    const choices = options.split('|').map((opt: string) => opt.trim()).filter((opt: string) => opt);
    if (choices.length === 0) return match;
    const randomIndex = Math.floor(Math.random() * choices.length);
    return choices[randomIndex];
  });
  
  // Handle {{variable}} syntax
  const variableRegex = /\{\{([^}]+)\}\}/g;
  result = result.replace(variableRegex, (match, variable) => {
    const key = variable.trim();
    return data[key] || match;
  });
  
  // Handle /column syntax
  const slashRegex = /\/([a-zA-Z0-9_]+)/g;
  result = result.replace(slashRegex, (match, column) => {
    const key = column.trim();
    return data[key] || match;
  });
  
  return result;
}

/**
 * Parse template to get available dynamic fields
 */
export function getAvailableDynamicFields(content: string): string[] {
  const fields = new Set<string>();
  
  // Extract /column syntax
  const slashRegex = /\/([a-zA-Z0-9_]+)/g;
  let match;
  while ((match = slashRegex.exec(content)) !== null) {
    fields.add(match[1].trim());
  }
  
  return Array.from(fields);
}

/**
 * Validate spintax syntax
 */
export function validateSpintax(content: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for balanced braces in spintax
  const spintaxRegex = /\{([^}]+)\}/g;
  let match;
  while ((match = spintaxRegex.exec(content)) !== null) {
    const options = match[1].split('|').map(opt => opt.trim());
    
    if (options.length < 2) {
      errors.push("Spintax must have at least 2 options separated by |");
    }
    
    if (options.some(opt => !opt)) {
      errors.push("Spintax options cannot be empty");
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}


