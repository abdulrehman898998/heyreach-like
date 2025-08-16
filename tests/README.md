# HeyReach Testing Suite

This folder contains comprehensive tests for the HeyReach Instagram DM automation platform.

## 📁 Test Structure

```
tests/
├── api/                    # API endpoint tests
│   ├── auth.test.ts       # Authentication tests
│   ├── accounts.test.ts   # Account management tests
│   ├── campaigns.test.ts  # Campaign tests
│   ├── leads.test.ts      # Lead management tests
│   └── proxies.test.ts    # Proxy management tests
├── integration/           # Integration tests
│   ├── database.test.ts   # Database operations
│   ├── redis.test.ts      # Redis operations
│   └── s3.test.ts         # S3/MinIO operations
├── unit/                  # Unit tests
│   ├── crypto.test.ts     # Encryption utilities
│   ├── rateLimit.test.ts  # Rate limiting logic
│   └── validation.test.ts # Zod validation schemas
├── e2e/                   # End-to-end tests
│   ├── auth-flow.test.ts  # Complete auth flow
│   ├── campaign-flow.test.ts # Campaign creation and execution
│   └── proxy-flow.test.ts # Proxy assignment and rotation
├── fixtures/              # Test data and fixtures
│   ├── users.json         # Test user data
│   ├── accounts.json      # Test account data
│   ├── campaigns.json     # Test campaign data
│   └── leads.csv          # Sample CSV leads
└── utils/                 # Test utilities
    ├── setup.ts           # Test setup and teardown
    ├── helpers.ts         # Common test helpers
    └── mocks.ts           # Mock data and functions
```

## 🚀 Running Tests

### Prerequisites

1. **Start test infrastructure:**
   ```bash
   # Start test database and services
   docker-compose -f docker/docker-compose.test.yml up -d
   ```

2. **Setup test environment:**
   ```bash
   # Copy test environment
   cp .env.test.example .env.test
   
   # Install test dependencies
   pnpm install
   ```

### Running Different Test Types

```bash
# Run all tests
pnpm test

# Run specific test categories
pnpm test:api          # API endpoint tests
pnpm test:integration  # Integration tests
pnpm test:unit         # Unit tests
pnpm test:e2e          # End-to-end tests

# Run specific test files
pnpm test tests/api/auth.test.ts
pnpm test tests/integration/database.test.ts

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

### Test Environment Variables

Create `.env.test` with test-specific configuration:

```env
# Test Database
DATABASE_URL=postgres://postgres:postgres@localhost:5433/heyreach_test

# Test Redis
REDIS_URL=redis://localhost:6380

# Test S3 (MinIO)
S3_ENDPOINT=http://localhost:9001
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=heyreach-test
S3_REGION=us-east-1

# Test App
APP_URL=http://localhost:3001
JWT_SECRET=test-jwt-secret-key-for-testing-only-32-chars
COOKIE_ENC_KEY_BASE64=dGVzdC1jb29raWUtZW5jcnlwdGlvbi1rZXktMzItY2hhcnM=

# Test Playwright
PLAYWRIGHT_HEADLESS=true
DEFAULT_UA=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
DEFAULT_TIMEZONE=Europe/London
DEFAULT_LOCALE=en-GB

# Test Proxy Settings
REQUIRE_RESIDENTIAL=true
ALLOW_MOBILE=true
ALLOW_DATACENTER=false
ASN_DENYLIST=16509,13335,15169,16276,14061,14618
IP_INTEL_CACHE_TTL=1800
PROXY_HEALTH_TIMEOUT_MS=2500
MAX_PROXY_ROTATIONS_PER_24H=1
RISK_PAUSE_THRESHOLD=60

# Test Server
PORT=3001
NODE_ENV=test
```

## 🧪 Test Categories

### 1. API Tests (`tests/api/`)

Test all REST API endpoints with proper authentication and validation:

- **Authentication**: Login, register, token validation
- **Accounts**: CRUD operations, proxy assignment, status changes
- **Campaigns**: Creation, starting, pausing, status monitoring
- **Leads**: CSV upload, bulk operations, status tracking
- **Proxies**: Health checks, rotation, geo-matching

### 2. Integration Tests (`tests/integration/`)

Test interactions between different system components:

- **Database**: Schema validation, migrations, data integrity
- **Redis**: Queue operations, caching, session management
- **S3/MinIO**: File uploads, presigned URLs, cleanup

### 3. Unit Tests (`tests/unit/`)

Test individual functions and utilities:

- **Crypto**: Encryption/decryption, password hashing, JWT
- **Rate Limiting**: Daily limits, spacing calculations
- **Validation**: Zod schema validation, error handling

### 4. End-to-End Tests (`tests/e2e/`)

Test complete user workflows:

- **Auth Flow**: Registration → Login → Dashboard access
- **Campaign Flow**: Create campaign → Add leads → Start → Monitor
- **Proxy Flow**: Assign proxy → Health check → Rotation

## 📊 Test Data

### Fixtures (`tests/fixtures/`)

Pre-defined test data for consistent testing:

- **users.json**: Test user accounts
- **accounts.json**: Instagram account configurations
- **campaigns.json**: Campaign templates
- **leads.csv**: Sample lead data for upload testing

### Mock Data (`tests/utils/mocks.ts`)

Dynamic mock data generation:

- **User Mocks**: Random user data
- **Account Mocks**: Instagram account configurations
- **Proxy Mocks**: Proxy configurations
- **Campaign Mocks**: Campaign data

## 🔧 Test Utilities

### Setup (`tests/utils/setup.ts`)

Test environment setup and teardown:

- Database connection and cleanup
- Redis connection and cleanup
- S3 bucket setup and cleanup
- Test user creation and cleanup

### Helpers (`tests/utils/helpers.ts`)

Common test helper functions:

- **API Helpers**: HTTP request helpers with authentication
- **Database Helpers**: Query helpers, data insertion
- **Validation Helpers**: Response validation helpers
- **Time Helpers**: Date/time manipulation for tests

## 📈 Test Coverage

The test suite aims for comprehensive coverage:

- **API Endpoints**: 100% endpoint coverage
- **Business Logic**: 90%+ function coverage
- **Error Handling**: All error paths tested
- **Edge Cases**: Boundary conditions and edge cases
- **Security**: Authentication and authorization tests

## 🚨 Test Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data
3. **Realistic Data**: Use realistic test data
4. **Error Testing**: Test both success and failure cases
5. **Performance**: Tests should run quickly
6. **Documentation**: Clear test descriptions

## 🔍 Debugging Tests

### Common Issues

1. **Database Connection**: Check test database is running
2. **Redis Connection**: Verify Redis test instance
3. **Port Conflicts**: Ensure test ports don't conflict
4. **Environment Variables**: Check `.env.test` configuration

### Debug Commands

```bash
# Run single test with verbose output
pnpm test tests/api/auth.test.ts --verbose

# Run tests with debug logging
DEBUG=* pnpm test

# Run tests and show coverage
pnpm test:coverage --reporter=html
```

## 📝 Adding New Tests

### API Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setupTestEnvironment, cleanupTestEnvironment } from '../utils/setup'
import { createTestUser, loginUser } from '../utils/helpers'

describe('API Endpoint', () => {
  let testUser: any
  let authToken: string

  beforeAll(async () => {
    await setupTestEnvironment()
    testUser = await createTestUser()
    authToken = await loginUser(testUser.email, testUser.password)
  })

  afterAll(async () => {
    await cleanupTestEnvironment()
  })

  it('should perform expected action', async () => {
    // Test implementation
    expect(result).toBeDefined()
  })
})
```

### Integration Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '../../apps/web-api/src/lib/drizzle'

describe('Integration Test', () => {
  beforeAll(async () => {
    // Setup test data
  })

  afterAll(async () => {
    // Cleanup test data
  })

  it('should integrate components correctly', async () => {
    // Test implementation
  })
})
```

---

**Note**: Always run tests in the test environment to avoid affecting development or production data.
