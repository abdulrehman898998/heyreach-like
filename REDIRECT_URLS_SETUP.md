# Redirect URLs Setup Guide

## 🎯 Quick Reference

### For Local Development (localhost:3000)

#### Google Cloud Console
1. **Go to:** https://console.cloud.google.com/apis/credentials
2. **Find:** OAuth 2.0 Client ID: `345720291620-nt24fm0q0nmkgesl92ds4qgjc7n0hhoc`
3. **Add Redirect URI:**
   ```
   http://localhost:3000/api/auth/google/callback
   ```

#### Meta Developer Console
1. **Go to:** https://developers.facebook.com/apps/your-app-id
2. **Webhooks → Edit Subscription:**
   ```
   Callback URL: http://localhost:3000/api/webhooks/instagram
   Verify Token: instagram_webhook_verify_token
   ```
3. **Instagram Basic Display → Valid OAuth Redirect URIs:**
   ```
   http://localhost:3000/api/auth/instagram/callback
   ```

### For Production (Current Replit)
- Keep existing URLs with: `4e5d0c13-a2dd-49ed-8535-2554e092b236-00-t14c84l0xx4p.picard.replit.dev`

## 📋 Step-by-Step Instructions

### Google Cloud Console Setup

#### Step 1: Navigate to Credentials
1. Open: https://console.cloud.google.com/apis/credentials
2. Sign in with your Google account
3. Select your project (if you have multiple)

#### Step 2: Find OAuth Client
1. Look for "OAuth 2.0 Client IDs" section
2. Click on: `345720291620-nt24fm0q0nmkgesl92ds4qgjc7n0hhoc.apps.googleusercontent.com`

#### Step 3: Add Redirect URI
1. Scroll to "Authorized redirect URIs"
2. Click "Add URI"
3. Enter: `http://localhost:3000/api/auth/google/callback`
4. Click "Save"

#### ✅ Success Confirmation
- You should see the new URI in the list
- Test: Google OAuth flow will work locally

### Meta Developer Console Setup

#### Step 1: Access Your App
1. Go to: https://developers.facebook.com/apps/
2. Find your app (App ID: from your META_APP_ID)
3. Click to open app dashboard

#### Step 2: Update Webhooks
1. Left sidebar → "Webhooks"
2. Find "Instagram" webhook
3. Click "Edit"
4. Update fields:
   - **Callback URL:** `http://localhost:3000/api/webhooks/instagram`
   - **Verify Token:** `instagram_webhook_verify_token`
5. Click "Verify and save"

#### Step 3: Update OAuth Redirects
1. Left sidebar → "Instagram Basic Display"
2. Find "Valid OAuth Redirect URIs"
3. Add: `http://localhost:3000/api/auth/instagram/callback`
4. Save changes

#### ✅ Success Confirmation
- Webhook shows "Verified" status
- OAuth redirect is listed and saved

## 🔧 Database Configuration

### Option 1: Keep Current Database (Easiest)
```bash
# In your local .env.local file:
DATABASE_URL=postgresql://current_replit_database_url
```

### Option 2: Migrate to Supabase
```bash
# In your local .env.local file:
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
```

**No code changes needed!** Drizzle ORM handles both automatically.

## 🚀 Local Development Commands

```bash
# Download code from Replit
# Create .env.local with DATABASE_URL and secrets

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Push database schema (creates tables)
npm run db:push

# Start development server
npm run dev

# Visit: http://localhost:3000
```

## 🧪 Testing Checklist

### Database Connection
- [ ] `npm run db:push` succeeds
- [ ] App starts without database errors
- [ ] Can create user accounts

### Google OAuth
- [ ] "Connect Google Account" button works
- [ ] Redirects to Google login
- [ ] Returns to app with tokens
- [ ] Can access Google Sheets

### Meta/Instagram
- [ ] Instagram webhook responds to test calls
- [ ] OAuth flow completes successfully
- [ ] Can connect Instagram accounts

### Browser Automation  
- [ ] Playwright browsers installed
- [ ] Instagram bot can launch
- [ ] Profile creation works locally

## 🔍 Troubleshooting

### "redirect_uri_mismatch" Error
- Double-check URL spelling in Google Console
- Ensure `http://` (not `https://`) for localhost
- Wait 5-10 seconds after saving changes

### Webhook Verification Failed
- Check callback URL is exactly: `http://localhost:3000/api/webhooks/instagram`
- Verify token matches: `instagram_webhook_verify_token`
- Ensure app is running on port 3000

### Database Connection Issues
```bash
# Test connection directly
psql "your_database_url"

# Reset schema if needed
npm run db:push --force
```

## 📁 Files Modified for Local Support

✅ **Already Updated:**
- `server/services/googleSheetsService.ts` - Auto-detects local vs production
- `server/routes.ts` - Smart redirect URLs
- `package.json.localhost` - Local development scripts

✅ **No Changes Needed:**
- All database files (Drizzle handles everything)
- Frontend components (work with any backend URL)
- API endpoints (same regardless of database)

Your code is now ready for seamless local development! 🎉