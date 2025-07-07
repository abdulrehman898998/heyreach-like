# Instagram Webhook Filtering - How It Works

## The Problem You Raised
Instagram webhooks trigger for ALL messages - both outgoing (from your bot) and incoming (customer replies). We only want to process customer replies, not your own messages.

## The Solution Implemented

### 3-Layer Filtering System:

#### 1. **Echo Detection**
```javascript
if (!message || (message as any).is_echo) {
  console.log('Skipping echo message or empty message');
  continue;
}
```
- Instagram marks messages sent by your business account with `is_echo: true`
- We skip these immediately

#### 2. **Direction Filtering** 
```javascript
const senderId = messaging.sender.id;      // Who sent the message
const recipientId = messaging.recipient.id; // Who received it

// Check if recipientId matches any of our business accounts
const businessAccounts = await storage.getSocialAccountsByPlatform('instagram');
const matchingAccount = businessAccounts.find(account => 
  account.instagramBusinessId === recipientId
);
```
- **Outgoing message**: sender = your business, recipient = customer
- **Incoming reply**: sender = customer, recipient = your business  
- We only process when the **recipient** is your business account

#### 3. **Business Account Validation**
```javascript
if (!matchingAccount) {
  console.log('Message received for unknown business account:', recipientId);
  continue;
}
```
- Only process messages for business accounts connected in our system
- Prevents processing messages for accounts not managed by our platform

## Message Flow Examples:

### ❌ FILTERED OUT (Your Bot Sends Message):
```
Sender: your_business_account_id (123456)
Recipient: customer_id (789012)
→ SKIPPED: Your business is sender, not recipient
```

### ✅ PROCESSED (Customer Replies):
```
Sender: customer_id (789012)  
Recipient: your_business_account_id (123456)
→ PROCESSED: Your business is recipient = customer reply
```

## Why This Works Perfectly:

1. **Echo flag** catches most outgoing messages
2. **Direction check** ensures only incoming messages are processed  
3. **Account validation** ensures security and proper filtering
4. **Detailed logging** helps debug any issues

## Result:
- Your automation sends messages: **Webhook triggered but FILTERED OUT**
- Customer replies to your message: **Webhook triggered and PROCESSED**
- Perfect separation between outgoing automation and incoming replies!

The system now only tracks genuine customer replies while ignoring your bot's outgoing messages.