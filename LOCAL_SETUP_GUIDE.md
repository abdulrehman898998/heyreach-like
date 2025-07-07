# SocialBot Pro - Local Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v12 or higher) 
3. **Python** (v3.8 or higher) - for requirements.txt
4. **Git**

## Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd socialbot-pro

# Install Node.js dependencies
npm install

# Install Python dependencies (if using Python components)
pip install -r requirements.txt

# Install Playwright browsers
npx playwright install chromium
```

## Step 2: Database Setup

### Option A: Local PostgreSQL
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt-get install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

```sql
-- In PostgreSQL prompt
CREATE DATABASE socialbot_pro;
CREATE USER socialbot_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE socialbot_pro TO socialbot_user;
\q
```

### Option B: AWS RDS PostgreSQL

1. Go to AWS RDS Console
2. Create new PostgreSQL instance
3. Choose appropriate instance class (t3.micro for testing)
4. Set database name: `socialbot_pro`
5. Set username: `socialbot_user`
6. Set password: `your_secure_password`
7. Configure security group to allow your IP
8. Note the endpoint URL

## Step 3: Environment Configuration

Create `.env` file in project root:

```bash
# Database Configuration
DATABASE_URL=postgresql://socialbot_user:your_secure_password@localhost:5432/socialbot_pro
# For AWS RDS: postgresql://socialbot_user:your_secure_password@your-rds-endpoint:5432/socialbot_pro

# Meta/Facebook App Credentials (for Instagram webhooks)
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret

# Google OAuth Credentials (for Google Sheets)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Session Secret
SESSION_SECRET=your_random_session_secret

# Environment
NODE_ENV=development
```

## Step 4: Database Schema Setup

```bash
# Push database schema (creates all tables)
npm run db:push

# Verify schema creation
npm run db:studio
```

## Step 5: Meta Developer App Setup (for Instagram)

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create new app → Business → Next
3. Add Instagram Basic Display product
4. Configure OAuth redirect: `http://localhost:5000/api/auth/instagram/callback`
5. Add webhook URL: `http://localhost:5000/api/webhooks/instagram`
6. Note your App ID and App Secret

## Step 6: Google Cloud Console Setup (for Sheets)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google Sheets API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `http://localhost:5000/api/auth/google/callback`
6. Download credentials JSON

## Step 7: Start the Application

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

The application will be available at `http://localhost:5000`

## Step 8: Initial Testing

1. **Database Test**: Visit `/api/health` to verify database connection
2. **Google Sheets**: Add a Google Sheet with Instagram URLs in Column A, messages in Column B
3. **Instagram Account**: Add your Instagram credentials (they'll be encrypted)
4. **Create Campaign**: Link your Google Sheet and Instagram account
5. **Test Automation**: Start a small campaign with 2-3 targets

## Folder Structure

```
socialbot-pro/
├── client/                 # React frontend
├── server/                 # Express backend
│   ├── automation/         # Instagram/Facebook bots
│   ├── services/          # Business logic
│   └── routes/            # API endpoints
├── shared/                # Shared types and schemas
├── chromium_profiles/     # Persistent browser sessions
├── .env                   # Environment variables
└── drizzle.config.ts      # Database configuration
```

## Important Notes

### Security
- Never commit `.env` files to version control
- Use strong passwords for database access
- Keep Meta and Google credentials secure
- Consider using environment-specific configurations

### Performance
- Chromium profiles are stored locally for session persistence
- Each Instagram account gets its own browser profile
- Database indexes are optimized for campaign queries

### Troubleshooting

**Database Connection Issues:**
```bash
# Test connection manually
psql postgresql://socialbot_user:password@localhost:5432/socialbot_pro
```

**Playwright Issues:**
```bash
# Reinstall browsers
npx playwright install --force
```

**Permission Issues:**
```bash
# Fix profile directory permissions
chmod -R 755 chromium_profiles/
```

## Development Commands

```bash
# Database
npm run db:push          # Push schema changes
npm run db:studio        # Open database browser
npm run db:generate      # Generate migrations

# Development
npm run dev              # Start with hot reload
npm run build            # Build for production
npm run start            # Start production server

# Testing
npm run test             # Run test suite
npm run test:integration # Integration tests
```

## Production Deployment

For production deployment, consider:
- Use managed PostgreSQL (AWS RDS, Google Cloud SQL)
- Set up proper SSL certificates
- Configure reverse proxy (nginx)
- Use process manager (PM2)
- Set up monitoring and logging
- Configure automated backups

## Support

If you encounter issues:
1. Check the logs in `./logs/` directory
2. Verify environment variables are set correctly
3. Ensure database connectivity
4. Check Playwright browser installation
5. Verify Meta/Google API credentials