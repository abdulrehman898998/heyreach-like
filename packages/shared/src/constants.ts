// Warmup Configuration
export const WARMUP_CONFIG = {
  PHASE_0_IDLE_MIN: 6,
  PHASE_0_IDLE_MAX: 12,
  PHASE_1_DURATION_MIN: 48 * 60 * 60 * 1000, // 48 hours in ms
  PHASE_1_DURATION_MAX: 72 * 60 * 60 * 1000, // 72 hours in ms
  TRIAL_DMS_MAX: 3,
  ACTION_SPACING_MIN: 3 * 60 * 1000, // 3 minutes
  ACTION_SPACING_MAX: 8 * 60 * 1000, // 8 minutes
  DM_SPACING_WARMUP_MIN: 10 * 60 * 1000, // 10 minutes
  DM_SPACING_WARMUP_MAX: 20 * 60 * 1000, // 20 minutes
} as const;

// Post-Warmup Configuration
export const ACTIVE_CONFIG = {
  DAILY_MSG_LIMIT: 50,
  DM_SPACING_MIN: 2 * 60 * 1000, // 2 minutes
  DM_SPACING_MAX: 6 * 60 * 1000, // 6 minutes
  ORGANIC_ACTIONS_BEFORE_DM: { min: 1, max: 3 },
  TYPING_SPEED_MIN: 80, // ms per character
  TYPING_SPEED_MAX: 140, // ms per character
  TYPING_JITTER: 20, // ms jitter
} as const;

// Organic Action Timings
export const ORGANIC_ACTIONS = {
  VISIT_PROFILE: { min: 5, max: 30 },
  FOLLOW_WAIT: { min: 30, max: 90 },
  LIKE_WAIT: { min: 15, max: 45 },
  VIEW_STORY: { min: 10, max: 25 },
  FEED_SCROLL: { min: 10, max: 60 },
} as const;

// Backoff Configuration
export const BACKOFF_CONFIG = {
  INITIAL_DELAY: 30 * 1000, // 30 seconds
  MULTIPLIER: 4, // 30s -> 2m -> 10m
  MAX_ATTEMPTS: 3,
} as const;

// Proxy Configuration
export const PROXY_CONFIG = {
  HEALTH_TIMEOUT_MS: 2500,
  MAX_ROTATIONS_PER_24H: 1,
  IP_INTEL_CACHE_TTL: 1800, // 30 minutes
  RISK_PAUSE_THRESHOLD: 60,
} as const;

// Queue Names
export const QUEUE_NAMES = {
  WARMUP: 'warmup',
  DM_SEND: 'dmSend',
  HEALTH_CHECK: 'healthCheck',
  MCP: 'mcp',
  MAINTENANCE: 'maintenance',
} as const;

// Page Kinds for Selectors
export const PAGE_KINDS = {
  LOGIN: 'login',
  PROFILE: 'profile',
  DM: 'dm',
  FEED: 'feed',
  STORY: 'story',
  CHECKPOINT: 'checkpoint',
  OTP: 'otp',
  CAPTCHA: 'captcha',
} as const;

// Action Kinds for Selectors
export const ACTION_KINDS = {
  LOGIN: 'login',
  OPEN_DM: 'open_dm',
  SEND_DM: 'send_dm',
  VISIT_PROFILE: 'visit_profile',
  FOLLOW: 'follow',
  LIKE: 'like',
  VIEW_STORY: 'view_story',
  SCROLL_FEED: 'scroll_feed',
  NAVIGATE: 'navigate',
} as const;

// Account Statuses
export const ACCOUNT_STATUS = {
  WARMING: 'warming',
  ACTIVE: 'active',
  PAUSED: 'paused',
  NEEDS_MANUAL_VERIFICATION: 'needs_manual_verification',
} as const;

// Proxy Statuses
export const PROXY_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  TESTING: 'testing',
} as const;

export const PROXY_HEALTH_STATUS = {
  OK: 'ok',
  DEGRADED: 'degraded',
  DEAD: 'dead',
} as const;

export const PROXY_IP_TYPE = {
  RESIDENTIAL: 'residential',
  MOBILE: 'mobile',
  DATACENTER: 'datacenter',
} as const;

// Campaign Statuses
export const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
} as const;

// Message Statuses
export const MESSAGE_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
  BLOCKED: 'blocked',
} as const;

// Lead Statuses
export const LEAD_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
  BLOCKED: 'blocked',
} as const;

// Action Log Results
export const ACTION_RESULT = {
  SUCCESS: 'success',
  FAILED: 'failed',
  BLOCKED: 'blocked',
} as const;

// Notification Channels
export const NOTIFICATION_CHANNEL = {
  EMAIL: 'email',
  IN_APP: 'in_app',
} as const;

// MCP State Classifications
export const MCP_STATE_CLASSIFICATION = {
  OK: 'ok',
  OTP_REQUIRED: 'otp_required',
  CHECKPOINT: 'checkpoint',
  CAPTCHA: 'captcha',
  IP_SUSPECTED: 'ip_suspected',
  UNKNOWN: 'unknown',
} as const;

// MCP Tools
export const MCP_TOOLS = {
  BROWSER_CLICK: 'browser_click',
  BROWSER_TYPE: 'browser_type',
  WAIT: 'wait',
} as const;

// Selector Sources
export const SELECTOR_SOURCE = {
  BASELINE: 'baseline',
  MCP: 'mcp',
  MANUAL: 'manual',
} as const;

// Default Device Profile
export const DEFAULT_DEVICE_PROFILE = {
  ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  timezone: 'Europe/London',
  locale: 'en-GB',
  viewport: { width: 1920, height: 1080 },
  fonts_hash: 'default',
} as const;

// Redis Keys
export const REDIS_KEYS = {
  ACCOUNT_LOCK: (accountId: number) => `lock:account:${accountId}`,
  DAILY_MSG_COUNT: (accountId: number, date: string) => `daily_msg:${accountId}:${date}`,
  IP_INTEL_CACHE: (ip: string) => `ip_intel:${ip}`,
  PROXY_ROTATIONS: (accountId: number, date: string) => `proxy_rotations:${accountId}:${date}`,
  SELECTOR_CACHE: (pageKind: string, actionKind: string) => `selector:${pageKind}:${actionKind}`,
} as const;

// S3 Paths
export const S3_PATHS = {
  SCREENSHOTS: (accountId: number, timestamp: string) => `screenshots/${accountId}/${timestamp}.png`,
  DOM_SNAPSHOTS: (accountId: number, timestamp: string) => `dom_snapshots/${accountId}/${timestamp}.json`,
  LOGS: (date: string) => `logs/${date}/`,
} as const;

// Error Codes
export const ERROR_CODES = {
  PROXY_HEALTH_FAILED: 'PROXY_HEALTH_FAILED',
  GEO_MISMATCH: 'GEO_MISMATCH',
  ASN_DENIED: 'ASN_DENIED',
  SELECTOR_FAILED: 'SELECTOR_FAILED',
  LOGIN_FAILED: 'LOGIN_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  ACCOUNT_BLOCKED: 'ACCOUNT_BLOCKED',
  MCP_FAILED: 'MCP_FAILED',
  DAILY_LIMIT_EXCEEDED: 'DAILY_LIMIT_EXCEEDED',
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  ACCOUNT_NEEDS_VERIFICATION: 'account_needs_verification',
  PROXY_ISSUE: 'proxy_issue',
  CAMPAIGN_COMPLETED: 'campaign_completed',
  DAILY_LIMIT_REACHED: 'daily_limit_reached',
  SYSTEM_ALERT: 'system_alert',
} as const;

// Maintenance Job Types
export const MAINTENANCE_JOB_TYPES = {
  RESET_DAILY_COUNTERS: 'reset_daily_counters',
  CLEANUP_SESSIONS: 'cleanup_sessions',
  ARCHIVE_LOGS: 'archive_logs',
} as const;
