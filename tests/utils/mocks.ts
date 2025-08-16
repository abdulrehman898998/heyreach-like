import { faker } from '@faker-js/faker'

// Mock user data
export function mockUser(overrides: Partial<any> = {}) {
  return {
    email: faker.internet.email(),
    password: 'password123',
    ...overrides,
  }
}

// Mock Instagram account data
export function mockAccount(overrides: Partial<any> = {}) {
  return {
    username: faker.internet.userName(),
    status: 'active',
    home_country: 'US',
    home_city: faker.location.city(),
    daily_msg_limit: 50,
    daily_msg_count: 0,
    risk_score: 0,
    ...overrides,
  }
}

// Mock proxy data
export function mockProxy(overrides: Partial<any> = {}) {
  return {
    provider: faker.company.name(),
    endpoint_template: `http://${faker.internet.userName()}:${faker.internet.password()}@proxy.${faker.internet.domainName()}:8080`,
    username: faker.internet.userName(),
    password: faker.internet.password(),
    ip_type: 'residential',
    country: 'US',
    city: faker.location.city(),
    asn: faker.number.int({ min: 1000, max: 99999 }),
    isp: faker.company.name(),
    sticky_supported: true,
    sticky_label: `sticky_${faker.string.alphanumeric(8)}`,
    rotation_mode: 'sticky',
    health_status: 'ok',
    status: 'active',
    latency_ms: faker.number.int({ min: 20, max: 200 }),
    fail_rate: faker.number.float({ min: 0, max: 0.1, precision: 0.01 }),
    score: faker.number.float({ min: 0.5, max: 1.0, precision: 0.01 }),
    ...overrides,
  }
}

// Mock campaign data
export function mockCampaign(overrides: Partial<any> = {}) {
  return {
    name: faker.company.catchPhrase(),
    account_ids: [],
    daily_limit_per_account: faker.number.int({ min: 10, max: 100 }),
    status: 'draft',
    ...overrides,
  }
}

// Mock lead data
export function mockLead(overrides: Partial<any> = {}) {
  return {
    profile_url: `https://instagram.com/${faker.internet.userName()}`,
    first_name: faker.person.firstName(),
    custom_fields: {
      company: faker.company.name(),
      industry: faker.company.buzzNoun(),
      position: faker.person.jobTitle(),
    },
    status: 'pending',
    ...overrides,
  }
}

// Mock message data
export function mockMessage(overrides: Partial<any> = {}) {
  return {
    body_resolved: faker.lorem.sentence(),
    status: 'pending',
    attempts: 0,
    ...overrides,
  }
}

// Mock action log data
export function mockActionLog(overrides: Partial<any> = {}) {
  return {
    action_type: faker.helpers.arrayElement(['login', 'dm_send', 'like_post', 'follow_user']),
    target: faker.internet.url(),
    result: faker.helpers.arrayElement(['success', 'failed', 'blocked']),
    details: {
      method: faker.helpers.arrayElement(['cookie_auth', 'password_auth']),
      duration_ms: faker.number.int({ min: 500, max: 5000 }),
    },
    ...overrides,
  }
}

// Mock notification data
export function mockNotification(overrides: Partial<any> = {}) {
  return {
    type: faker.helpers.arrayElement(['account_warmed', 'dm_sent', 'proxy_rotated', 'campaign_completed']),
    channel: faker.helpers.arrayElement(['email', 'in_app']),
    payload: {
      account_username: faker.internet.userName(),
      campaign_name: faker.company.catchPhrase(),
      lead_name: faker.person.firstName(),
    },
    is_read: false,
    ...overrides,
  }
}

// Mock CSV lead data
export function mockCSVLeads(count: number = 10): Array<{ profile_url: string; first_name: string; company: string }> {
  return Array.from({ length: count }, () => ({
    profile_url: `https://instagram.com/${faker.internet.userName()}`,
    first_name: faker.person.firstName(),
    company: faker.company.name(),
  }))
}

// Mock device profile data
export function mockDeviceProfile(overrides: Partial<any> = {}) {
  return {
    ua: faker.internet.userAgent(),
    timezone: faker.helpers.arrayElement(['America/New_York', 'Europe/London', 'Asia/Tokyo']),
    locale: faker.helpers.arrayElement(['en-US', 'en-GB', 'ja-JP']),
    viewport: {
      width: faker.number.int({ min: 1024, max: 1920 }),
      height: faker.number.int({ min: 768, max: 1080 }),
    },
    fonts_hash: faker.string.alphanumeric(32),
    ...overrides,
  }
}

// Mock selector registry data
export function mockSelectorRegistry(overrides: Partial<any> = {}) {
  return {
    page_kind: faker.helpers.arrayElement(['login', 'dm', 'profile', 'feed']),
    action_kind: faker.helpers.arrayElement(['click', 'type', 'scroll', 'wait']),
    selector_text: faker.helpers.arrayElement([
      'button[data-testid="login-button"]',
      'input[name="username"]',
      'textarea[placeholder="Message..."]',
      'div[role="button"]',
    ]),
    source: faker.helpers.arrayElement(['baseline', 'mcp', 'manual']),
    success_count: faker.number.int({ min: 0, max: 100 }),
    fail_count: faker.number.int({ min: 0, max: 10 }),
    score: faker.number.float({ min: 0, max: 1, precision: 0.01 }),
    ...overrides,
  }
}

// Mock MCP response data
export function mockMCPResponse(overrides: Partial<any> = {}) {
  return {
    success: true,
    analysis: {
      page_state: faker.helpers.arrayElement(['normal', 'otp_required', 'captcha_required', 'checkpoint_required']),
      confidence: faker.number.float({ min: 0.5, max: 1.0, precision: 0.01 }),
      suggested_actions: [
        {
          action: faker.helpers.arrayElement(['wait', 'retry', 'manual_verification']),
          reason: faker.lorem.sentence(),
          selector: faker.helpers.arrayElement([
            'button[data-testid="submit"]',
            'input[name="code"]',
            'div[class*="captcha"]',
          ]),
        },
      ],
      new_selectors: [
        {
          page_kind: 'login',
          action_kind: 'click',
          selector_text: `button[data-testid="${faker.string.alphanumeric(8)}"]`,
          confidence: faker.number.float({ min: 0.5, max: 1.0, precision: 0.01 }),
        },
      ],
    },
    ...overrides,
  }
}

// Mock API response data
export function mockApiResponse<T = any>(data: T, overrides: Partial<any> = {}) {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

// Mock paginated response data
export function mockPaginatedResponse<T = any>(
  items: T[],
  page: number = 1,
  limit: number = 10,
  total: number = items.length,
  overrides: Partial<any> = {}
) {
  return {
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    },
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

// Mock error response
export function mockErrorResponse(message: string = 'An error occurred', overrides: Partial<any> = {}) {
  return {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

// Mock JWT token
export function mockJWTToken(payload: any = {}) {
  const defaultPayload = {
    id: faker.number.int({ min: 1, max: 1000 }),
    email: faker.internet.email(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    ...payload,
  }
  
  // This is a mock token - in real tests, use the actual JWT generation
  return `mock.jwt.token.${btoa(JSON.stringify(defaultPayload))}`
}

// Mock file upload data
export function mockFileUpload(filename: string = 'test.csv', content: string = 'test,data,csv') {
  return {
    fieldname: 'file',
    originalname: filename,
    encoding: '7bit',
    mimetype: 'text/csv',
    buffer: Buffer.from(content),
    size: content.length,
  }
}

// Mock rate limit data
export function mockRateLimitData(overrides: Partial<any> = {}) {
  return {
    remaining: faker.number.int({ min: 0, max: 100 }),
    reset: Math.floor(Date.now() / 1000) + 3600,
    limit: 100,
    ...overrides,
  }
}

// Mock health check data
export function mockHealthCheck(overrides: Partial<any> = {}) {
  return {
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'ok',
      redis: 'ok',
      s3: 'ok',
    },
    ...overrides,
  }
}

// Mock automation stats
export function mockAutomationStats(overrides: Partial<any> = {}) {
  return {
    dm_sent_today: faker.number.int({ min: 0, max: 100 }),
    dm_success_rate: faker.number.float({ min: 0.7, max: 1.0, precision: 0.01 }),
    mcp_invocations: faker.number.int({ min: 0, max: 50 }),
    queue_depth: faker.number.int({ min: 0, max: 1000 }),
    proxy_health: faker.number.float({ min: 0.8, max: 1.0, precision: 0.01 }),
    active_accounts: faker.number.int({ min: 1, max: 10 }),
    active_campaigns: faker.number.int({ min: 0, max: 5 }),
    ...overrides,
  }
}

// Generate bulk mock data
export function generateBulkMockData<T>(
  mockFunction: () => T,
  count: number,
  overrides: Partial<T> = {}
): T[] {
  return Array.from({ length: count }, () => ({
    ...mockFunction(),
    ...overrides,
  }))
}

// Mock time-based data
export function mockTimeBasedData(baseDate: Date = new Date()) {
  return {
    created_at: baseDate,
    updated_at: baseDate,
    warmup_started_at: new Date(baseDate.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    warmup_completed_at: new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    last_msg_reset_at: baseDate,
    last_login_at: new Date(baseDate.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
    sent_at: new Date(baseDate.getTime() - 30 * 60 * 1000), // 30 minutes ago
  }
}
