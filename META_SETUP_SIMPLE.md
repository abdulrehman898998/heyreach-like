# Meta Developer Setup - Simple Guide

## DO NOT PUBLISH YOUR APP ❌

**Important**: For webhook reply tracking, your Meta app does NOT need to be published. You can use it in Development Mode.

## Step-by-Step Setup:

### 1. Create/Access Your Meta App
- Go to https://developers.facebook.com/apps/
- Use your existing app or create a new one
- **Keep it in Development Mode** (don't publish)

### 2. Add Required Products
In your Meta app, go to **Products** and add:
- ✅ **Instagram Basic Display**
- ✅ **Webhooks** 

### 3. Configure Webhooks
1. Go to **Products** → **Webhooks**
2. Click **Add Subscription** 
3. Choose **Instagram**
4. Add this URL: `https://4e5d0c13-a2dd-49ed-8535-2554e092b236-00-t14c84l0xx4p.picard.replit.dev/api/webhooks/instagram`
5. Add verify token: `socialbot_webhook_2024` (save this!)
6. Subscribe to: `messages`, `message_reactions`

### 4. Get Your Credentials
From **Settings** → **Basic**:
- Copy your **App ID**
- Copy your **App Secret**

### 5. Instagram Business Account
- Make sure your Instagram account is set to **Business** (not Personal)
- Go to Instagram → Settings → Account → Switch to Professional Account

### 6. What We Need From You:
```
App ID: [Your App ID]
App Secret: [Your App Secret]
Instagram Business Account Username: [Your Instagram username]
```

## Why App Doesn't Need to Be Published:

- **Development Mode**: Perfect for testing webhooks
- **Your Own Account**: You can test with your own Instagram Business account
- **No Review Required**: Development mode bypasses Meta's app review process
- **Full Functionality**: Webhooks work the same in development mode

## Next Steps:
1. Share your App ID and App Secret with me
2. I'll add them to the platform
3. We'll test a message → reply → webhook flow
4. If you want to use it for other people's accounts later, then you can consider publishing

## Current Status:
- ✅ Google Sheets: Working (you can now connect your account)
- 🔄 Instagram Webhooks: Waiting for your Meta app credentials
- ✅ All other features: Ready to use

The platform is 95% ready - we just need your Meta App ID and App Secret to enable reply tracking!