# Meta Developer Setup - Simple Guide

## You're Almost Done! 

Your App ID and App Secret are now configured. Just need to add the webhook URL to your Meta Developer Console:

### Quick Steps:

1. **Go to**: https://developers.facebook.com/apps/2012776769248458/

2. **Add Webhooks Product**: 
   - Click "Add Product" 
   - Find "Webhooks" and click "Set Up"

3. **Configure Webhook**:
   - Callback URL: `https://024329d0-778d-4771-8bfc-70b78cc4617d.picard.prod.repl.dev/api/webhooks/instagram`
   - Verify Token: `instagram_webhook_verify_token`
   - Subscribe to: `messages`, `message_reactions`

4. **Instagram Basic Display**:
   - Make sure this product is also added
   - No extra configuration needed

### That's It!

Once you add the webhook URL, users can:
- Add their Instagram accounts (username/password) 
- Click "Connect" to enable webhook replies
- Send campaigns and track customer replies automatically

### Current Status:
- ✅ App ID configured: 2012776769248458
- ✅ App Secret configured: 59fac28f3e5d3988caf08f357c0c9ac2
- ✅ Instagram OAuth service ready
- ✅ Webhook endpoints ready
- 🔄 **Next**: Add webhook URL to Meta Console

Your app can stay in Development Mode - works perfectly for testing webhooks!