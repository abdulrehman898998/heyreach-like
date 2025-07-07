# Message Tracking & Reply Matching System

## The Challenge You Identified

You're absolutely right! The current system has a gap:

1. **When bot sends message**: We store it in our database but need Instagram's message ID
2. **When customer replies**: Webhook gives us Instagram's message ID they're replying to
3. **To match reply to original**: We need to connect Instagram's message ID to our database

## Current Database Schema (Already Good!)

```sql
messages table:
- id: Our internal ID
- instagramMessageId: Instagram's message ID (when we send)
- campaignId, targetId, content, etc.

replies table:  
- messageId: Links to our messages.id
- replyToMessageId: Instagram's message ID being replied to
- instagramUserId: Customer who replied
```

## The Missing Piece: Getting Instagram Message ID

**Problem**: When we send a message via automation, we need to capture Instagram's returned message ID.

**Current Code**: 
```javascript
await bot.sendDirectMessage(target.profileUrl, message.content);
// ❌ We lose Instagram's response with message ID
```

**What We Need**:
```javascript
const response = await bot.sendDirectMessage(target.profileUrl, message.content);
// ✅ response should contain Instagram's message ID
```

## Two Solutions:

### Solution 1: Extract Message ID from DOM (Easier)
After sending message in Instagram bot, extract the message ID from the chat:

```javascript
// In InstagramBot.sendDirectMessage()
await messageInput.fill(message);
await sendButton.click();

// Wait for message to appear in chat
await page.waitForTimeout(2000);

// Extract the message ID from the last sent message
const lastMessage = await page.locator('[data-testid="message"]').last();
const messageId = await lastMessage.getAttribute('data-message-id');

return { messageId, success: true };
```

### Solution 2: Instagram API Integration (More Reliable)
Use Instagram Graph API to send messages instead of browser automation:

```javascript
// Send via Instagram Graph API
const response = await fetch(`https://graph.instagram.com/v18.0/${pageId}/messages`, {
  method: 'POST',
  body: JSON.stringify({
    recipient: { id: customerId },
    message: { text: message }
  }),
  headers: { 'Authorization': `Bearer ${pageAccessToken}` }
});

const data = await response.json();
return { messageId: data.message_id };
```

## Reply Matching Logic (Already Working!)

```javascript
// When webhook arrives with customer reply:
const replyToMessageId = webhookData.message.reply_to?.mid;

if (replyToMessageId) {
  // Find our original message by Instagram ID
  const originalMessages = await storage.getMessagesByInstagramId(replyToMessageId);
  if (originalMessages.length > 0) {
    // Perfect match! Store the reply
    await storage.createReply({
      messageId: originalMessages[0].id,
      instagramUserId: webhookData.sender.id,
      content: webhookData.message.text,
      replyToMessageId: replyToMessageId
    });
  }
}
```

## Current Status:

✅ **Database schema**: Ready for message tracking  
✅ **Webhook filtering**: Only processes customer replies  
✅ **Reply matching logic**: Already implemented  
🔄 **Missing**: Instagram message ID capture when sending  

## Recommendation:

Start with **Solution 1** (DOM extraction) since it works with current browser automation. Later upgrade to **Solution 2** (API) for more reliability.

The reply tracking system is 95% complete - just need to capture Instagram's message ID when sending!