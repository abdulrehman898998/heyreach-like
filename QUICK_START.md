# SocialBot Pro - Quick Start Guide

## 🚀 Get Started in 15 Minutes

### Prerequisites Checklist
- [ ] Node.js 18+ installed
- [ ] PostgreSQL database ready (local or AWS)
- [ ] Meta Developer account (for Instagram)
- [ ] Google Cloud account (for Sheets API)

## Step 1: Install & Setup (5 minutes)

```bash
# Clone and install
git clone <your-repo>
cd socialbot-pro
npm install

# Install Playwright
npx playwright install chromium

# Test installation
node test-local-setup.js
```

## Step 2: Database Setup (3 minutes)

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL
sudo apt-get install postgresql

# Create database
sudo -u postgres createdb socialbot_pro
sudo -u postgres createuser socialbot_user

# Run schema
psql -U socialbot_user -d socialbot_pro -f database-schema.sql
```

**Option B: AWS RDS**
- Follow AWS_DATABASE_SETUP.md
- Get your RDS endpoint URL

## Step 3: Environment Configuration (2 minutes)

```bash
# Copy template
cp local-env-template.txt .env

# Edit .env with your values:
DATABASE_URL=postgresql://user:pass@host:5432/socialbot_pro
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
SESSION_SECRET=random_string_here
```

## Step 4: API Setup (3 minutes)

**Meta Developer Setup:**
1. Go to https://developers.facebook.com/
2. Create app → Business
3. Add Instagram Basic Display
4. Get App ID and Secret

**Google Sheets Setup:**
1. Go to https://console.cloud.google.com/
2. Enable Google Sheets API
3. Create OAuth credentials
4. Download credentials

## Step 5: Test & Run (2 minutes)

```bash
# Test system
node test-local-setup.js

# Start development server
npm run dev

# Visit http://localhost:5000
```

## 🎯 First Campaign Test

### 1. Create Google Sheet
- Column A: Instagram URLs (e.g., https://instagram.com/username)
- Column B: Custom messages
- Share with public view access

### 2. Add Instagram Account
- Go to Social Accounts
- Add your Instagram credentials
- They're encrypted and stored securely

### 3. Connect Google Sheet
- Go to Google Sheets
- Authenticate with Google
- Add your sheet URL

### 4. Create Campaign
- Go to Campaigns → New Campaign
- Select Instagram account
- Select Google Sheet
- Set 2-3 targets for testing
- Start campaign

### 5. Monitor Progress
- Watch real-time URL processing
- Check browser automation window
- View logs and progress

## 🔧 Troubleshooting

**Database Connection Failed:**
```bash
# Test connection
psql postgresql://user:pass@host:5432/database
```

**Playwright/Chromium Issues:**
```bash
# Reinstall browsers
npx playwright install --force chromium
```

**Permission Errors:**
```bash
# Fix permissions
chmod -R 755 chromium_profiles/
```

**API Authentication Failed:**
- Verify Meta App ID/Secret
- Check Google credentials
- Ensure redirect URLs match

## 📁 Project Structure

```
socialbot-pro/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   └── components/    # UI components
├── server/                # Express backend
│   ├── automation/        # Browser automation
│   ├── services/         # Business logic
│   └── routes/           # API endpoints
├── shared/               # Shared types
├── chromium_profiles/    # Browser sessions
├── .env                  # Environment config
└── database-schema.sql   # Database setup
```

## 🚀 Production Deployment

**Environment Setup:**
- Use managed PostgreSQL (AWS RDS)
- Set proper SSL certificates
- Configure reverse proxy (nginx)
- Use process manager (PM2)

**Security:**
- Restrict database access
- Use environment variables
- Enable HTTPS
- Set up monitoring

**Performance:**
- Enable database indexing
- Configure caching
- Set up load balancing
- Monitor resource usage

## 📞 Support

**Common Issues:**
1. Check environment variables
2. Verify database connectivity
3. Test API credentials
4. Check browser installation

**Resources:**
- LOCAL_SETUP_GUIDE.md - Detailed setup
- AWS_DATABASE_SETUP.md - AWS database config
- test-local-setup.js - System testing

**Need Help?**
Run the test script to identify issues:
```bash
node test-local-setup.js
```