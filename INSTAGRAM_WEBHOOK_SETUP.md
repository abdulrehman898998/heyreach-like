# Instagram Webhook Setup - User Flow Explanation

## How It Actually Works

You're absolutely right! Here's the correct flow:

### 1. User Adds Instagram Account (Username/Password)
- User goes to "Social Accounts" page
- Adds their Instagram username and password for automation
- This is for bot login and sending messages

### 2. User Connects Instagram Business Account (OAuth)
- **SEPARATE STEP**: User clicks "Connect Instagram for Webhooks" 
- This opens Instagram OAuth popup
- User logs in with THE SAME Instagram account (but this is OAuth, not username/password)
- User grants permissions to receive webhooks

### 3. What Happens After OAuth Connection:
- Platform gets their Instagram Business account ID
- Platform gets their Page Access Token
- Platform automatically subscribes their account to webhooks
- Now when ANYONE replies to messages sent FROM their account, webhooks trigger

### 4. Reply Flow:
```
User's Instagram Account → Sends automated message to Customer
Customer → Replies to that message  
Instagram → Sends webhook to our platform
Platform → Matches reply to original campaign
Platform → Shows reply in analytics dashboard
```

## Technical Implementation:

### Meta Developer App Setup (Your Part):
1. Create ONE Meta Developer app (keep in Development Mode)
2. Add "Instagram Basic Display" and "Webhooks" products
3. Configure webhook URL: `https://your-replit-domain.com/api/webhooks/instagram`
4. Get App ID and App Secret

### User Experience:
1. **Add Account**: Username/password for automation
2. **Connect Webhooks**: OAuth popup to connect same account for webhooks
3. **Start Campaign**: Send messages using username/password login
4. **Receive Replies**: Webhooks automatically catch replies

### Database Structure:
```sql
social_accounts table:
- username: "their_instagram_username" 
- password: "their_encrypted_password"
- instagram_business_id: "from_oauth"
- page_access_token: "from_oauth" 
- webhook_connected: true/false
```

## Why This Design:
- **Automation**: Needs username/password (Playwright automation)
- **Webhooks**: Needs OAuth (Instagram Business API)
- **Same Account**: User uses one Instagram account for both purposes
- **No Publishing**: Meta app stays in Development Mode, works perfectly

## What We Need From You:
- Meta App ID
- Meta App Secret  
- That's it! Each user will connect their own Instagram account via OAuth

This way, every user who adds their Instagram account can receive webhooks for replies to THEIR messages, not just a single business account.