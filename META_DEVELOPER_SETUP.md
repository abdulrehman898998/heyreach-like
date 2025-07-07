# Meta Developer Setup for Instagram Webhook Reply Tracking

## Required Meta Credentials & Configuration

### 1. **App ID & App Secret** ✅ REQUIRED
- **App ID**: Your Meta App's unique identifier  
- **App Secret**: Your Meta App's secret key
- **Where to find**: Meta Developers Console → Your App → Settings → Basic

### 2. **Instagram Business Account** ✅ REQUIRED  
- Must be an Instagram Business or Creator account
- Cannot use personal Instagram accounts
- **How to get**: Convert your Instagram to Business in Instagram settings

### 3. **Page Access Token** ✅ REQUIRED
- Long-lived access token for your Instagram Business account
- **Permissions needed**: 
  - `instagram_basic`
  - `instagram_manage_messages` 
  - `pages_manage_metadata`

### 4. **Webhook Configuration** ✅ REQUIRED

#### Webhook URL to Add in Meta Console:
```
https://4e5d0c13-a2dd-49ed-8535-2554e092b236-00-t14c84l0xx4p.picard.replit.dev/api/webhooks/instagram
```

#### Webhook Events to Subscribe:
- ✅ **messages** - Customer messages to your business
- ✅ **message_reactions** - Customer reactions to messages  
- ✅ **messaging_postbacks** - Button clicks
- ✅ **messaging_seen** - Message read receipts

#### Verify Token:
You'll need to set `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` environment variable.

## Setup Steps:

### Step 1: Meta Developers Console
1. Go to https://developers.facebook.com/apps
2. Find your app or create a new one
3. Add **Instagram Basic Display** product
4. Add **Webhooks** product

### Step 2: App Permissions  
1. Go to **App Review** → **Permissions and Features**
2. Request these permissions:
   - `instagram_basic` (Standard Access)
   - `instagram_manage_messages` (Advanced Access) 
   - `pages_manage_metadata` (Standard Access)

### Step 3: Webhooks Configuration
1. Go to **Products** → **Webhooks**
2. Click **Edit Subscription** for Instagram
3. Add callback URL: `https://4e5d0c13-a2dd-49ed-8535-2554e092b236-00-t14c84l0xx4p.picard.replit.dev/api/webhooks/instagram`
4. Add verify token (any string - save this for environment)
5. Subscribe to fields: `messages`, `message_reactions`, `messaging_postbacks`, `messaging_seen`

### Step 4: Page Access Token
1. Go to **Tools** → **Graph API Explorer**
2. Select your app
3. Generate Page Access Token for your Instagram Business page
4. Make it long-lived using token debugger

### Step 5: Environment Variables Needed
```bash
INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret  
INSTAGRAM_PAGE_ACCESS_TOKEN=your_long_lived_token
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=your_verify_token
```

## How Reply Tracking Works:

1. **Customer receives automated message** from your Instagram Business account
2. **Customer replies** to that message  
3. **Instagram sends webhook** to our platform with reply data
4. **Platform matches reply** to original campaign message
5. **Reply is stored** and displayed in analytics dashboard

## Requirements for Production:

### App Review (Advanced Access):
- Your app needs **Advanced Access** for `instagram_manage_messages`
- Submit for review with business verification
- Explain use case: "Automated customer engagement with reply tracking"

### Business Verification:
- Verify your business in Meta Business Manager
- Link Instagram Business account to Meta Business account

## Current Implementation Status:
✅ Webhook endpoint created (`/api/webhooks/instagram`)  
✅ Reply tracking database schema  
✅ Message-to-reply matching logic  
✅ Analytics integration  
🔄 **Need**: Meta App credentials from you  
🔄 **Need**: Webhook URL added to Meta Console  

## Next Steps:
1. Provide your Meta App ID & App Secret
2. Add webhook URL to Meta Developers Console  
3. Generate Page Access Token for Instagram Business account
4. Test webhook with a real reply to confirm tracking works

The reply tracking system is fully built and ready - we just need the Meta credentials and webhook configuration!