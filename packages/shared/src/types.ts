export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
}

export interface Proxy {
  id: number;
  provider: string;
  endpoint_template: string;
  username: string;
  password: string;
  ip_type: 'residential' | 'mobile' | 'datacenter';
  country: string; // ISO-2
  city?: string;
  asn?: number;
  isp?: string;
  sticky_supported: boolean;
  sticky_label?: string;
  rotation_mode: 'sticky' | 'city_rotate' | 'country_rotate';
  cooldown_until?: Date;
  health_status: 'ok' | 'degraded' | 'dead';
  latency_ms?: number;
  fail_rate?: number;
  score?: number;
  assigned_account_id?: number;
  last_used_at?: Date;
  status: 'active' | 'inactive' | 'testing';
  created_at: Date;
}

export interface Account {
  id: number;
  user_id: number;
  username: string;
  status: 'warming' | 'active' | 'paused' | 'needs_manual_verification';
  assigned_proxy_id?: number;
  session_label?: string;
  home_country: string; // ISO-2
  home_city?: string;
  cookies_encrypted?: string;
  device_fingerprint_json?: Record<string, any>;
  warmup_started_at?: Date;
  warmup_completed_at?: Date;
  daily_msg_limit: number;
  daily_msg_count: number;
  last_msg_reset_at?: Date;
  last_login_at?: Date;
  risk_score: number;
  last_ip_country?: string;
  last_ip_asn?: number;
  last_ip_type?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProxyBinding {
  id: number;
  account_id: number;
  proxy_id: number;
  bound_at: Date;
  unbound_at?: Date;
  reason?: string;
}

export interface Campaign {
  id: number;
  user_id: number;
  name: string;
  template_id?: number;
  account_ids: number[];
  schedule_json?: Record<string, any>;
  daily_limit_per_account?: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  created_at: Date;
}

export interface Lead {
  id: number;
  user_id: number;
  campaign_id?: number;
  profile_url: string;
  first_name?: string;
  custom_fields?: Record<string, any>;
  status: 'pending' | 'sent' | 'failed' | 'blocked';
  created_at: Date;
}

export interface Message {
  id: number;
  campaign_id: number;
  account_id: number;
  lead_id: number;
  body_resolved: string;
  status: 'pending' | 'sent' | 'failed' | 'blocked';
  error_code?: string;
  attempts: number;
  sent_at?: Date;
  created_at: Date;
}

export interface ActionLog {
  id: number;
  account_id: number;
  action_type: string;
  target?: string;
  result: 'success' | 'failed' | 'blocked';
  details?: Record<string, any>;
  screenshot_path?: string;
  created_at: Date;
}

export interface Notification {
  id: number;
  user_id: number;
  account_id?: number;
  type: string;
  channel: 'email' | 'in_app';
  payload: Record<string, any>;
  is_read: boolean;
  created_at: Date;
}

export interface SelectorRegistry {
  id: number;
  page_kind: string;
  action_kind: string;
  selector_text: string;
  source: 'baseline' | 'mcp' | 'manual';
  success_count: number;
  fail_count: number;
  score: number;
  last_success_at?: Date;
  last_fail_at?: Date;
  created_at: Date;
}

export interface DeviceProfile {
  id: string;
  ua: string;
  timezone: string;
  locale: string;
  viewport: { width: number; height: number };
  fonts_hash: string;
}

// MCP Response Types
export interface MCPResponse {
  state_classification: 'ok' | 'otp_required' | 'checkpoint' | 'captcha' | 'ip_suspected' | 'unknown';
  action_plan: MCPAction[];
  new_selectors?: MCPSelector[];
  user_instruction?: string;
}

export interface MCPAction {
  tool: 'browser_click' | 'browser_type' | 'wait';
  args: Record<string, any>;
}

export interface MCPSelector {
  page: string;
  action: string;
  selector: string;
}

// Queue Job Types
export interface WarmupJob {
  account_id: number;
  phase: 0 | 1 | 2;
  scheduled_at: Date;
}

export interface DMSendJob {
  account_id: number;
  lead_id: number;
  campaign_id: number;
  message_body: string;
}

export interface HealthCheckJob {
  proxy_id?: number;
  account_id?: number;
}

export interface MCPJob {
  account_id: number;
  goal: string;
  url: string;
  dom_snapshot: string;
  screenshot_url: string;
  tried_selectors: string[];
  account_health: {
    risk_score: number;
    recent_frictions: string[];
  };
}

export interface MaintenanceJob {
  type: 'reset_daily_counters' | 'cleanup_sessions' | 'archive_logs';
  scheduled_at: Date;
}

// API Request/Response Types
export interface CreateAccountRequest {
  username: string;
  password?: string;
  totp_secret?: string;
  home_country: string;
  home_city?: string;
}

export interface CreateCampaignRequest {
  name: string;
  template_id?: number;
  account_ids: number[];
  lead_ids: number[];
  schedule_json?: Record<string, any>;
  daily_limit_per_account?: number;
}

export interface UploadLeadsRequest {
  csv_data: string;
  mapping: Record<string, string>;
}

export interface CreateProxyRequest {
  provider: string;
  endpoint_template: string;
  username: string;
  password: string;
  ip_type: 'residential' | 'mobile' | 'datacenter';
  country: string;
  city?: string;
  sticky_supported?: boolean;
}

// Stats and Metrics
export interface AutomationStats {
  dm_sent_success_rate: number;
  mcp_invocations: number;
  accounts_needing_verification: number;
  daily_job_throughput: number;
  proxy_health_ok: number;
  proxy_health_degraded: number;
  proxy_health_dead: number;
  proxy_rotations_24h: number;
  accounts_paused_proxy_issue: number;
  geo_mismatch_events: number;
  asn_denied_events: number;
  queue_depths: Record<string, number>;
  worker_count: number;
}
