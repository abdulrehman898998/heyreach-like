# HeyReach - Instagram DM Automation Platform

A comprehensive SaaS platform for Instagram DM outreach automation with advanced proxy management, AI-powered recovery, and manual verification capabilities.

## 🚀 Features

- **Instagram DM Automation**: Automated sending of personalized DMs
- **Proxy Management**: Residential/mobile proxy support with geo-matching
- **AI-Powered Recovery**: MCP/LLM integration for handling selector changes
- **Manual Verification**: User-friendly OTP/captcha handling
- **Account Warmup**: AutoIGDM-style 48-72 hour warmup strategy
- **Rate Limiting**: Intelligent spacing and daily limits
- **Real-time Monitoring**: Live stats and health checks
- **Secure Authentication**: JWT + AES-GCM encryption

## 🏗️ Architecture

- **Monorepo**: pnpm workspaces with shared packages
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Queue System**: BullMQ + Redis
- **Browser Automation**: Playwright (Chromium)
- **Storage**: MinIO (S3-compatible)
- **Frontend**: React + Vite + Tailwind CSS

## 📋 Prerequisites

- Node.js 18+ and pnpm 8.15.0+
- Docker and Docker Compose
- PostgreSQL (via Docker)
- Redis (via Docker)
- MinIO (via Docker)

## 🛠️ Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd heyreach-like
pnpm install
```

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
# Postgres
DATABASE_URL=postgres://postgres:postgres@localhost:5432/heyreach

# Redis
REDIS_URL=redis://localhost:6379

# S3 (MinIO)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=heyreach-artifacts
S3_REGION=us-east-1

# App
APP_URL=http://localhost:5173
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
COOKIE_ENC_KEY_BASE64=dGVzdC1jb29raWUtZW5jcnlwdGlvbi1rZXktMzItY2hhcnM=

# Playwright
PLAYWRIGHT_HEADLESS=true
DEFAULT_UA=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
DEFAULT_TIMEZONE=Europe/London
DEFAULT_LOCALE=en-GB

# Proxy/IP Intel
REQUIRE_RESIDENTIAL=true
ALLOW_MOBILE=true
ALLOW_DATACENTER=false
ASN_DENYLIST=16509,13335,15169,16276,14061,14618
IP_INTEL_CACHE_TTL=1800
PROXY_HEALTH_TIMEOUT_MS=2500
MAX_PROXY_ROTATIONS_PER_24H=1
RISK_PAUSE_THRESHOLD=60
```

### 3. Start Infrastructure

```bash
# Start all services (PostgreSQL, Redis, MinIO)
pnpm docker:up
```

### 4. Database Setup

```bash
# Push database schema
pnpm db:push

# Seed with test data
pnpm db:seed
```

### 5. Start Development Servers

```bash
# Start all services in development mode
pnpm dev
```

This will start:
- **Backend API**: http://localhost:3000
- **Frontend**: http://localhost:5173
- **Health Check**: http://localhost:3000/health

## 🧪 Testing the Application

### 1. Frontend Testing

1. Open http://localhost:5173 in your browser
2. Use the test credentials:
   - **Email**: `test@heyreach.com`
   - **Password**: `password123`
3. Explore the dashboard and test the authentication flow

### 2. API Testing

Test the backend API endpoints:

```bash
# Health check
curl http://localhost:3000/health

# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@heyreach.com","password":"password123"}'

# Get user profile (with token from login)
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Get accounts
curl -X GET http://localhost:3000/api/accounts \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Get campaigns
curl -X GET http://localhost:3000/api/campaigns \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Database Verification

Connect to the database to verify the seeded data:

```bash
# Connect to PostgreSQL container
docker exec -it heyreach-postgres psql -U postgres -d heyreach

# View tables
\dt

# Check users
SELECT * FROM users;

# Check accounts
SELECT * FROM accounts;

# Check campaigns
SELECT * FROM campaigns;
```

## 📊 Available Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Accounts
- `GET /api/accounts` - List user's accounts
- `POST /api/accounts` - Create new account
- `GET /api/accounts/:id` - Get account details
- `POST /api/accounts/:id/relogin` - Force re-login
- `GET /api/accounts/:id/verify` - Get verification session
- `POST /api/accounts/:id/assign-proxy` - Assign proxy
- `POST /api/accounts/:id/rotate-proxy` - Rotate proxy

### Campaigns
- `GET /api/campaigns` - List user's campaigns
- `POST /api/campaigns` - Create new campaign
- `GET /api/campaigns/:id` - Get campaign details
- `POST /api/campaigns/:id/start` - Start campaign
- `POST /api/campaigns/:id/pause` - Pause campaign
- `GET /api/campaigns/:id/status` - Get campaign status
- `DELETE /api/campaigns/:id` - Delete campaign

### Leads
- `GET /api/leads` - List user's leads
- `POST /api/leads/upload` - Upload CSV leads
- `GET /api/leads/:id` - Get lead details
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead
- `POST /api/leads/bulk-assign` - Bulk assign leads
- `GET /api/leads/stats` - Get lead statistics

### Proxies
- `GET /api/proxies` - List all proxies
- `POST /api/proxies` - Register new proxy
- `GET /api/proxies/:id` - Get proxy details
- `PUT /api/proxies/:id` - Update proxy
- `DELETE /api/proxies/:id` - Delete proxy
- `POST /api/proxies/:id/health-check` - Health check
- `GET /api/proxies/stats` - Get proxy statistics

### Notifications
- `GET /api/notifications` - List notifications
- `GET /api/notifications/unread-count` - Get unread count
- `POST /api/notifications/:id/read` - Mark as read
- `POST /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification
- `POST /api/notifications/clear-read` - Clear read notifications
- `GET /api/notifications/stats` - Get notification statistics

### Automation Stats
- `GET /api/automation/stats` - Get automation statistics

## 🔧 Development

### Project Structure

```
heyreach-like/
├── apps/
│   ├── web-api/          # Backend API server
│   ├── worker/           # Background job processor (placeholder)
│   └── frontend/         # React frontend
├── packages/
│   └── shared/           # Shared types, constants, schemas
├── docker/               # Docker Compose configuration
└── docs/                 # Documentation
```

### Available Scripts

```bash
# Development
pnpm dev                  # Start all services in development
pnpm build               # Build all packages
pnpm test                # Run tests
pnpm lint                # Run linting

# Database
pnpm db:push             # Push database schema
pnpm db:seed             # Seed database with test data

# Docker
pnpm docker:up           # Start all Docker services
pnpm docker:down         # Stop all Docker services
pnpm docker:logs         # View Docker logs
```

### Adding New Features

1. **Backend API**: Add routes in `apps/web-api/src/routes/`
2. **Database**: Update schema in `apps/web-api/drizzle/schema.ts`
3. **Types**: Add interfaces in `packages/shared/src/types.ts`
4. **Validation**: Add schemas in `packages/shared/src/zod.ts`
5. **Frontend**: Add components in `apps/frontend/src/`

## 🚀 Production Deployment

### Environment Variables

Ensure all production environment variables are properly configured:

- Strong JWT secret (32+ characters)
- Secure cookie encryption key (32-byte base64)
- Production database URL
- Production Redis URL
- S3/MinIO credentials
- Proxy configuration

### Docker Deployment

```bash
# Build and start production services
docker-compose -f docker/docker-compose.yml up --build -d

# View logs
docker-compose -f docker/docker-compose.yml logs -f
```

## 🔒 Security Features

- **Authentication**: JWT tokens with secure expiration
- **Encryption**: AES-GCM for sensitive data
- **Rate Limiting**: Per-user and per-account limits
- **Input Validation**: Zod schemas for all inputs
- **CORS**: Configured for frontend domain
- **Helmet**: Security headers
- **Proxy Privacy**: IP masking and rotation

## 📈 Monitoring

- **Health Checks**: `/health` endpoint for all services
- **Real-time Stats**: Queue depth, success rates, proxy health
- **Error Logging**: Comprehensive error tracking
- **Performance Metrics**: Response times, throughput

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the API endpoints
- Test with the provided seed data
- Check Docker logs for service issues

---

**HeyReach** - Professional Instagram DM automation platform with advanced proxy management and AI-powered recovery capabilities.
