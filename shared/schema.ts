import { sql } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
  uuid,
  decimal,
  index
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password_hash: varchar("password_hash", { length: 255 }).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
}));

// Proxies table
export const proxies = pgTable("proxies", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  provider: varchar("provider", { length: 100 }).notNull(),
  endpoint_template: varchar("endpoint_template", { length: 500 }).notNull(),
  username: varchar("username", { length: 255 }),
  password: varchar("password", { length: 255 }),
  country: varchar("country", { length: 10 }).notNull(),
  sticky_supported: boolean("sticky_supported").notNull().default(true),
  assigned_account_id: integer("assigned_account_id"),
  last_used_at: timestamp("last_used_at"),
  status: varchar("status", { length: 20 }).notNull().default("available"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  statusIdx: index("proxies_status_idx").on(table.status),
  countryIdx: index("proxies_country_idx").on(table.country),
  assignedIdx: index("proxies_assigned_idx").on(table.assigned_account_id),
}));

// Accounts table
export const accounts = pgTable("accounts", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  username: varchar("username", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("warmup"),
  assigned_proxy_id: integer("assigned_proxy_id").references(() => proxies.id),
  session_label: varchar("session_label", { length: 255 }),
  cookies_encrypted: text("cookies_encrypted"),
  device_fingerprint_json: jsonb("device_fingerprint_json").notNull().default({}),
  warmup_started_at: timestamp("warmup_started_at"),
  warmup_completed_at: timestamp("warmup_completed_at"),
  daily_msg_limit: integer("daily_msg_limit").notNull().default(50),
  daily_msg_count: integer("daily_msg_count").notNull().default(0),
  last_msg_reset_at: timestamp("last_msg_reset_at"),
  last_login_at: timestamp("last_login_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  statusIdx: index("accounts_status_idx").on(table.status),
  userIdIdx: index("accounts_user_id_idx").on(table.user_id),
  proxyIdx: index("accounts_proxy_idx").on(table.assigned_proxy_id),
  usernameIdx: index("accounts_username_idx").on(table.username),
}));

// Campaigns table
export const campaigns = pgTable("campaigns", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  template_id: integer("template_id"),
  account_ids: jsonb("account_ids").notNull().default([]),
  schedule_json: jsonb("schedule_json"),
  daily_limit_per_account: integer("daily_limit_per_account").notNull().default(50),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("campaigns_user_id_idx").on(table.user_id),
  statusIdx: index("campaigns_status_idx").on(table.status),
}));

// Leads table
export const leads = pgTable("leads", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  campaign_id: integer("campaign_id").references(() => campaigns.id, { onDelete: 'set null' }),
  profile_url: varchar("profile_url", { length: 500 }).notNull(),
  first_name: varchar("first_name", { length: 255 }),
  custom_fields: jsonb("custom_fields").notNull().default({}),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("leads_user_id_idx").on(table.user_id),
  campaignIdx: index("leads_campaign_id_idx").on(table.campaign_id),
  statusIdx: index("leads_status_idx").on(table.status),
}));

// Messages table
export const messages = pgTable("messages", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  campaign_id: integer("campaign_id").notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  account_id: integer("account_id").notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  lead_id: integer("lead_id").notNull().references(() => leads.id, { onDelete: 'cascade' }),
  body_resolved: text("body_resolved").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  error_code: varchar("error_code", { length: 100 }),
  sent_at: timestamp("sent_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  attempts: integer("attempts").notNull().default(0),
}, (table) => ({
  campaignIdx: index("messages_campaign_id_idx").on(table.campaign_id),
  accountIdx: index("messages_account_id_idx").on(table.account_id),
  leadIdx: index("messages_lead_id_idx").on(table.lead_id),
  statusIdx: index("messages_status_idx").on(table.status),
}));

// Action logs table
export const action_logs = pgTable("action_logs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  account_id: integer("account_id").notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  action_type: varchar("action_type", { length: 50 }).notNull(),
  target: varchar("target", { length: 255 }),
  result: varchar("result", { length: 50 }).notNull(),
  details: jsonb("details").notNull().default({}),
  screenshot_path: varchar("screenshot_path", { length: 500 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  accountIdx: index("action_logs_account_id_idx").on(table.account_id),
  actionTypeIdx: index("action_logs_action_type_idx").on(table.action_type),
  createdIdx: index("action_logs_created_idx").on(table.created_at),
}));

// Notifications table
export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  account_id: integer("account_id").references(() => accounts.id, { onDelete: 'set null' }),
  type: varchar("type", { length: 50 }).notNull(),
  channel: varchar("channel", { length: 50 }).notNull().default("in_app"),
  payload: jsonb("payload").notNull().default({}),
  is_read: boolean("is_read").notNull().default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("notifications_user_id_idx").on(table.user_id),
  accountIdx: index("notifications_account_id_idx").on(table.account_id),
  typeIdx: index("notifications_type_idx").on(table.type),
  readIdx: index("notifications_read_idx").on(table.is_read),
}));

// Selector registry table
export const selector_registry = pgTable("selector_registry", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  page_kind: varchar("page_kind", { length: 100 }).notNull(),
  action_kind: varchar("action_kind", { length: 100 }).notNull(),
  selector_text: text("selector_text").notNull(),
  source: varchar("source", { length: 50 }).notNull().default("baseline"),
  success_count: integer("success_count").notNull().default(0),
  fail_count: integer("fail_count").notNull().default(0),
  score: decimal("score", { precision: 5, scale: 4 }).notNull().default("0.5000"),
  last_success_at: timestamp("last_success_at"),
  last_fail_at: timestamp("last_fail_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  pageKindIdx: index("selector_registry_page_kind_idx").on(table.page_kind),
  actionKindIdx: index("selector_registry_action_kind_idx").on(table.action_kind),
  sourceIdx: index("selector_registry_source_idx").on(table.source),
  scoreIdx: index("selector_registry_score_idx").on(table.score),
}));

// Message templates table
export const message_templates = pgTable("message_templates", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  content: text("content").notNull(),
  variables: text("variables").array().notNull().default([]),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("message_templates_user_id_idx").on(table.user_id),
  activeIdx: index("message_templates_active_idx").on(table.is_active),
}));

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

export const insertUserSchema = createInsertSchema(users);
export const insertProxySchema = createInsertSchema(proxies);
export const insertAccountSchema = createInsertSchema(accounts);
export const insertCampaignSchema = createInsertSchema(campaigns);
export const insertLeadSchema = createInsertSchema(leads);
export const insertMessageSchema = createInsertSchema(messages);
export const insertActionLogSchema = createInsertSchema(action_logs);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertSelectorRegistrySchema = createInsertSchema(selector_registry);
export const insertMessageTemplateSchema = createInsertSchema(message_templates);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Proxy = typeof proxies.$inferSelect;
export type InsertProxy = typeof proxies.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type ActionLog = typeof action_logs.$inferSelect;
export type InsertActionLog = typeof action_logs.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type SelectorRegistry = typeof selector_registry.$inferSelect;
export type InsertSelectorRegistry = typeof selector_registry.$inferInsert;
export type MessageTemplate = typeof message_templates.$inferSelect;
export type InsertMessageTemplate = typeof message_templates.$inferInsert;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const extractTemplateVariables = (content: string): string[] => {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = variableRegex.exec(content)) !== null) {
    const variable = match[1].trim();
    if (!variables.includes(variable)) {
      variables.push(variable);
    }
  }

  return variables;
};

export const generateMessage = (template: string, variables: Record<string, string>): string => {
  let message = template;

  // Replace variables
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    message = message.replace(regex, value || '');
  });

  // Handle spintax {option1|option2|option3}
  const spintaxRegex = /\{([^}]+)\}/g;
  message = message.replace(spintaxRegex, (match, options) => {
    const optionArray = options.split('|');
    const randomIndex = Math.floor(Math.random() * optionArray.length);
    return optionArray[randomIndex].trim();
  });

  return message;
};

export const getAvailableDynamicFields = (): string[] => {
  return [
    'name', 'firstName', 'lastName', 'company', 'industry', 'location',
    'profileUrl', 'bio', 'followers', 'following', 'posts'
  ];
};

export const validateSpintax = (content: string): boolean => {
  const spintaxRegex = /\{[^}]*\}/g;
  const matches = content.match(spintaxRegex);
  
  if (!matches) return true;
  
  return matches.every(match => {
    const options = match.slice(1, -1).split('|');
    return options.length >= 2 && options.every(option => option.trim().length > 0);
  });
};