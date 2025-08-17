import { z } from 'zod';
import { 
  ACCOUNT_STATUS, 
  PROXY_IP_TYPE, 
  PROXY_STATUS, 
  CAMPAIGN_STATUS, 
  MESSAGE_STATUS, 
  LEAD_STATUS,
  ACTION_RESULT,
  NOTIFICATION_CHANNEL,
  MCP_STATE_CLASSIFICATION,
  MCP_TOOLS,
  SELECTOR_SOURCE,
  PROXY_HEALTH_STATUS
} from './constants';

// Base schemas
export const BaseEntitySchema = z.object({
  id: z.number(),
  created_at: z.date(),
});

// User schemas
export const UserSchema = BaseEntitySchema.extend({
  email: z.string().email(),
  password_hash: z.string(),
});

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Proxy schemas
export const ProxySchema = BaseEntitySchema.extend({
  provider: z.string(),
  endpoint_template: z.string(),
  username: z.string(),
  password: z.string(),
  ip_type: z.enum([PROXY_IP_TYPE.RESIDENTIAL, PROXY_IP_TYPE.MOBILE, PROXY_IP_TYPE.DATACENTER]),
  country: z.string().length(2), // ISO-2
  city: z.string().optional(),
  asn: z.number().optional(),
  isp: z.string().optional(),
  sticky_supported: z.boolean(),
  sticky_label: z.string().optional(),
  rotation_mode: z.enum(['sticky', 'city_rotate', 'country_rotate']),
  cooldown_until: z.date().optional(),
  health_status: z.enum([PROXY_HEALTH_STATUS.OK, PROXY_HEALTH_STATUS.DEGRADED, PROXY_HEALTH_STATUS.DEAD]),
  latency_ms: z.number().optional(),
  fail_rate: z.number().optional(),
  score: z.number().optional(),
  assigned_account_id: z.number().optional(),
  last_used_at: z.date().optional(),
  status: z.enum([PROXY_STATUS.ACTIVE, PROXY_STATUS.INACTIVE, PROXY_STATUS.TESTING]),
});

export const CreateProxySchema = z.object({
  provider: z.string(),
  endpoint_template: z.string(),
  username: z.string(),
  password: z.string(),
  ip_type: z.enum([PROXY_IP_TYPE.RESIDENTIAL, PROXY_IP_TYPE.MOBILE, PROXY_IP_TYPE.DATACENTER]),
  country: z.string().length(2),
  city: z.string().optional(),
  sticky_supported: z.boolean().default(true),
});

// Account schemas
export const AccountSchema = BaseEntitySchema.extend({
  user_id: z.number(),
  username: z.string(),
  status: z.enum([ACCOUNT_STATUS.WARMING, ACCOUNT_STATUS.ACTIVE, ACCOUNT_STATUS.PAUSED, ACCOUNT_STATUS.NEEDS_MANUAL_VERIFICATION]),
  assigned_proxy_id: z.number().optional(),
  session_label: z.string().optional(),
  home_country: z.string().length(2),
  home_city: z.string().optional(),
  cookies_encrypted: z.string().optional(),
  device_fingerprint_json: z.record(z.any()).optional(),
  warmup_started_at: z.date().optional(),
  warmup_completed_at: z.date().optional(),
  daily_msg_limit: z.number(),
  daily_msg_count: z.number(),
  last_msg_reset_at: z.date().optional(),
  last_login_at: z.date().optional(),
  risk_score: z.number(),
  last_ip_country: z.string().optional(),
  last_ip_asn: z.number().optional(),
  last_ip_type: z.string().optional(),
  updated_at: z.date(),
});

export const CreateAccountSchema = z.object({
  username: z.string(),
  password: z.string().optional(),
  totp_secret: z.string().optional(),
  home_country: z.string().length(2),
  home_city: z.string().optional(),
});

export const AccountWithProxySchema = AccountSchema.extend({
  proxy: ProxySchema.optional(),
});

// Campaign schemas
export const CampaignSchema = BaseEntitySchema.extend({
  user_id: z.number(),
  name: z.string(),
  template_id: z.number().optional(),
  account_ids: z.array(z.number()),
  schedule_json: z.record(z.any()).optional(),
  daily_limit_per_account: z.number().optional(),
  status: z.enum([CAMPAIGN_STATUS.DRAFT, CAMPAIGN_STATUS.ACTIVE, CAMPAIGN_STATUS.PAUSED, CAMPAIGN_STATUS.COMPLETED]),
});

export const CreateCampaignSchema = z.object({
  name: z.string(),
  template_id: z.number().optional(),
  account_ids: z.array(z.number()),
  lead_ids: z.array(z.number()),
  schedule_json: z.record(z.any()).optional(),
  daily_limit_per_account: z.number().optional(),
});

// Lead schemas
export const LeadSchema = BaseEntitySchema.extend({
  user_id: z.number(),
  campaign_id: z.number().optional(),
  profile_url: z.string().url(),
  first_name: z.string().optional(),
  custom_fields: z.record(z.any()).optional(),
  status: z.enum([LEAD_STATUS.PENDING, LEAD_STATUS.SENT, LEAD_STATUS.FAILED, LEAD_STATUS.BLOCKED]),
});

export const UploadLeadsSchema = z.object({
  csv_data: z.string(),
  mapping: z.record(z.string()),
});

// Message schemas
export const MessageSchema = BaseEntitySchema.extend({
  campaign_id: z.number(),
  account_id: z.number(),
  lead_id: z.number(),
  body_resolved: z.string(),
  status: z.enum([MESSAGE_STATUS.PENDING, MESSAGE_STATUS.SENT, MESSAGE_STATUS.FAILED, MESSAGE_STATUS.BLOCKED]),
  error_code: z.string().optional(),
  attempts: z.number(),
  sent_at: z.date().optional(),
});

// Action Log schemas
export const ActionLogSchema = BaseEntitySchema.extend({
  account_id: z.number(),
  action_type: z.string(),
  target: z.string().optional(),
  result: z.enum([ACTION_RESULT.SUCCESS, ACTION_RESULT.FAILED, ACTION_RESULT.BLOCKED]),
  details: z.record(z.any()).optional(),
  screenshot_path: z.string().optional(),
});

// Notification schemas
export const NotificationSchema = BaseEntitySchema.extend({
  user_id: z.number(),
  account_id: z.number().optional(),
  type: z.string(),
  channel: z.enum([NOTIFICATION_CHANNEL.EMAIL, NOTIFICATION_CHANNEL.IN_APP]),
  payload: z.record(z.any()),
  is_read: z.boolean(),
});

// Selector Registry schemas
export const SelectorRegistrySchema = BaseEntitySchema.extend({
  page_kind: z.string(),
  action_kind: z.string(),
  selector_text: z.string(),
  source: z.enum([SELECTOR_SOURCE.BASELINE, SELECTOR_SOURCE.MCP, SELECTOR_SOURCE.MANUAL]),
  success_count: z.number(),
  fail_count: z.number(),
  score: z.number(),
  last_success_at: z.date().optional(),
  last_fail_at: z.date().optional(),
});

// MCP schemas
export const MCPActionSchema = z.object({
  tool: z.enum([MCP_TOOLS.BROWSER_CLICK, MCP_TOOLS.BROWSER_TYPE, MCP_TOOLS.WAIT]),
  args: z.record(z.any()),
});

export const MCPSelectorSchema = z.object({
  page: z.string(),
  action: z.string(),
  selector: z.string(),
});

export const MCPResponseSchema = z.object({
  state_classification: z.enum([
    MCP_STATE_CLASSIFICATION.OK,
    MCP_STATE_CLASSIFICATION.OTP_REQUIRED,
    MCP_STATE_CLASSIFICATION.CHECKPOINT,
    MCP_STATE_CLASSIFICATION.CAPTCHA,
    MCP_STATE_CLASSIFICATION.IP_SUSPECTED,
    MCP_STATE_CLASSIFICATION.UNKNOWN,
  ]),
  action_plan: z.array(MCPActionSchema),
  new_selectors: z.array(MCPSelectorSchema).optional(),
  user_instruction: z.string().optional(),
});

// Device Profile schemas
export const DeviceProfileSchema = z.object({
  id: z.string(),
  ua: z.string(),
  timezone: z.string(),
  locale: z.string(),
  viewport: z.object({
    width: z.number(),
    height: z.number(),
  }),
  fonts_hash: z.string(),
});

// API Response schemas
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
  });

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    hasMore: z.boolean(),
  });

// Stats schemas
export const AutomationStatsSchema = z.object({
  dm_sent_success_rate: z.number(),
  mcp_invocations: z.number(),
  accounts_needing_verification: z.number(),
  daily_job_throughput: z.number(),
  proxy_health_ok: z.number(),
  proxy_health_degraded: z.number(),
  proxy_health_dead: z.number(),
  proxy_rotations_24h: z.number(),
  accounts_paused_proxy_issue: z.number(),
  geo_mismatch_events: z.number(),
  asn_denied_events: z.number(),
  queue_depths: z.record(z.number()),
  worker_count: z.number(),
});

// Queue Job schemas
export const WarmupJobSchema = z.object({
  account_id: z.number(),
  phase: z.number().min(0).max(2),
  scheduled_at: z.date(),
});

export const DMSendJobSchema = z.object({
  account_id: z.number(),
  lead_id: z.number(),
  campaign_id: z.number(),
  message_body: z.string(),
});

export const HealthCheckJobSchema = z.object({
  proxy_id: z.number().optional(),
  account_id: z.number().optional(),
});

export const MCPJobSchema = z.object({
  account_id: z.number(),
  goal: z.string(),
  url: z.string(),
  dom_snapshot: z.string(),
  screenshot_url: z.string(),
  tried_selectors: z.array(z.string()),
  account_health: z.object({
    risk_score: z.number(),
    recent_frictions: z.array(z.string()),
  }),
});

export const MaintenanceJobSchema = z.object({
  type: z.enum(['reset_daily_counters', 'cleanup_sessions', 'archive_logs']),
  scheduled_at: z.date(),
});

// Export all schemas
export const Schemas = {
  User: UserSchema,
  CreateUser: CreateUserSchema,
  Login: LoginSchema,
  Proxy: ProxySchema,
  CreateProxy: CreateProxySchema,
  Account: AccountSchema,
  CreateAccount: CreateAccountSchema,
  AccountWithProxy: AccountWithProxySchema,
  Campaign: CampaignSchema,
  CreateCampaign: CreateCampaignSchema,
  Lead: LeadSchema,
  UploadLeads: UploadLeadsSchema,
  Message: MessageSchema,
  ActionLog: ActionLogSchema,
  Notification: NotificationSchema,
  SelectorRegistry: SelectorRegistrySchema,
  MCPResponse: MCPResponseSchema,
  MCPAction: MCPActionSchema,
  MCPSelector: MCPSelectorSchema,
  DeviceProfile: DeviceProfileSchema,
  AutomationStats: AutomationStatsSchema,
  WarmupJob: WarmupJobSchema,
  DMSendJob: DMSendJobSchema,
  HealthCheckJob: HealthCheckJobSchema,
  MCPJob: MCPJobSchema,
  MaintenanceJob: MaintenanceJobSchema,
} as const;
