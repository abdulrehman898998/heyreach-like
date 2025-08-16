import { pgTable, serial, text, timestamp, integer, boolean, numeric, jsonb, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Proxies table
export const proxies = pgTable('proxies', {
  id: serial('id').primaryKey(),
  provider: text('provider').notNull(),
  endpoint_template: text('endpoint_template').notNull(),
  username: text('username').notNull(),
  password: text('password').notNull(),
  ip_type: text('ip_type', { enum: ['residential', 'mobile', 'datacenter'] }).notNull(),
  country: text('country').notNull(), // ISO-2
  city: text('city'),
  asn: integer('asn'),
  isp: text('isp'),
  sticky_supported: boolean('sticky_supported').default(true).notNull(),
  sticky_label: text('sticky_label'),
  rotation_mode: text('rotation_mode', { enum: ['sticky', 'city_rotate', 'country_rotate'] }).notNull(),
  cooldown_until: timestamp('cooldown_until'),
  health_status: text('health_status', { enum: ['ok', 'degraded', 'dead'] }).default('ok').notNull(),
  latency_ms: integer('latency_ms'),
  fail_rate: numeric('fail_rate'),
  score: numeric('score'),
  assigned_account_id: integer('assigned_account_id'),
  last_used_at: timestamp('last_used_at'),
  status: text('status', { enum: ['active', 'inactive', 'testing'] }).default('active').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Accounts table
export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id),
  username: text('username').notNull(),
  status: text('status', { enum: ['warming', 'active', 'paused', 'needs_manual_verification'] }).default('warming').notNull(),
  assigned_proxy_id: integer('assigned_proxy_id').references(() => proxies.id),
  session_label: text('session_label'),
  home_country: text('home_country').notNull(), // ISO-2
  home_city: text('home_city'),
  cookies_encrypted: text('cookies_encrypted'),
  device_fingerprint_json: jsonb('device_fingerprint_json'),
  warmup_started_at: timestamp('warmup_started_at'),
  warmup_completed_at: timestamp('warmup_completed_at'),
  daily_msg_limit: integer('daily_msg_limit').default(50).notNull(),
  daily_msg_count: integer('daily_msg_count').default(0).notNull(),
  last_msg_reset_at: timestamp('last_msg_reset_at'),
  last_login_at: timestamp('last_login_at'),
  risk_score: integer('risk_score').default(0).notNull(),
  last_ip_country: text('last_ip_country'),
  last_ip_asn: integer('last_ip_asn'),
  last_ip_type: text('last_ip_type'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Proxy bindings table
export const proxy_bindings = pgTable('proxy_bindings', {
  id: serial('id').primaryKey(),
  account_id: integer('account_id').notNull().references(() => accounts.id),
  proxy_id: integer('proxy_id').notNull().references(() => proxies.id),
  bound_at: timestamp('bound_at').defaultNow().notNull(),
  unbound_at: timestamp('unbound_at'),
  reason: text('reason'),
});

// Campaigns table
export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  template_id: integer('template_id'),
  account_ids: jsonb('account_ids').$type<number[]>().notNull(),
  schedule_json: jsonb('schedule_json'),
  daily_limit_per_account: integer('daily_limit_per_account'),
  status: text('status', { enum: ['draft', 'active', 'paused', 'completed'] }).default('draft').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Leads table
export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id),
  campaign_id: integer('campaign_id').references(() => campaigns.id),
  profile_url: text('profile_url').notNull(),
  first_name: text('first_name'),
  custom_fields: jsonb('custom_fields'),
  status: text('status', { enum: ['pending', 'sent', 'failed', 'blocked'] }).default('pending').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Messages table
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  campaign_id: integer('campaign_id').notNull().references(() => campaigns.id),
  account_id: integer('account_id').notNull().references(() => accounts.id),
  lead_id: integer('lead_id').notNull().references(() => leads.id),
  body_resolved: text('body_resolved').notNull(),
  status: text('status', { enum: ['pending', 'sent', 'failed', 'blocked'] }).default('pending').notNull(),
  error_code: text('error_code'),
  attempts: integer('attempts').default(0).notNull(),
  sent_at: timestamp('sent_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Action logs table
export const action_logs = pgTable('action_logs', {
  id: serial('id').primaryKey(),
  account_id: integer('account_id').notNull().references(() => accounts.id),
  action_type: text('action_type').notNull(),
  target: text('target'),
  result: text('result', { enum: ['success', 'failed', 'blocked'] }).notNull(),
  details: jsonb('details'),
  screenshot_path: text('screenshot_path'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id),
  account_id: integer('account_id').references(() => accounts.id),
  type: text('type').notNull(),
  channel: text('channel', { enum: ['email', 'in_app'] }).notNull(),
  payload: jsonb('payload').notNull(),
  is_read: boolean('is_read').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Selector registry table
export const selector_registry = pgTable('selector_registry', {
  id: serial('id').primaryKey(),
  page_kind: text('page_kind').notNull(),
  action_kind: text('action_kind').notNull(),
  selector_text: text('selector_text').notNull(),
  source: text('source', { enum: ['baseline', 'mcp', 'manual'] }).notNull(),
  success_count: integer('success_count').default(0).notNull(),
  fail_count: integer('fail_count').default(0).notNull(),
  score: numeric('score').default(0).notNull(),
  last_success_at: timestamp('last_success_at'),
  last_fail_at: timestamp('last_fail_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Device profiles table (optional)
export const device_profiles = pgTable('device_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  ua: text('ua').notNull(),
  timezone: text('timezone').notNull(),
  locale: text('locale').notNull(),
  viewport: jsonb('viewport').$type<{ width: number; height: number }>().notNull(),
  fonts_hash: text('fonts_hash').notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  campaigns: many(campaigns),
  leads: many(leads),
  notifications: many(notifications),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.user_id],
    references: [users.id],
  }),
  proxy: one(proxies, {
    fields: [accounts.assigned_proxy_id],
    references: [proxies.id],
  }),
  proxy_bindings: many(proxy_bindings),
  messages: many(messages),
  action_logs: many(action_logs),
  notifications: many(notifications),
}));

export const proxiesRelations = relations(proxies, ({ one, many }) => ({
  assigned_account: one(accounts, {
    fields: [proxies.assigned_account_id],
    references: [accounts.id],
  }),
  proxy_bindings: many(proxy_bindings),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, {
    fields: [campaigns.user_id],
    references: [users.id],
  }),
  leads: many(leads),
  messages: many(messages),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  user: one(users, {
    fields: [leads.user_id],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [leads.campaign_id],
    references: [campaigns.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [messages.campaign_id],
    references: [campaigns.id],
  }),
  account: one(accounts, {
    fields: [messages.account_id],
    references: [accounts.id],
  }),
  lead: one(leads, {
    fields: [messages.lead_id],
    references: [leads.id],
  }),
}));

export const actionLogsRelations = relations(action_logs, ({ one }) => ({
  account: one(accounts, {
    fields: [action_logs.account_id],
    references: [accounts.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.user_id],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [notifications.account_id],
    references: [accounts.id],
  }),
}));

export const proxyBindingsRelations = relations(proxy_bindings, ({ one }) => ({
  account: one(accounts, {
    fields: [proxy_bindings.account_id],
    references: [accounts.id],
  }),
  proxy: one(proxies, {
    fields: [proxy_bindings.proxy_id],
    references: [proxies.id],
  }),
}));

// Export all tables
export const schema = {
  users,
  proxies,
  accounts,
  proxy_bindings,
  campaigns,
  leads,
  messages,
  action_logs,
  notifications,
  selector_registry,
  device_profiles,
};
