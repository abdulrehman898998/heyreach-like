import { Request, Response } from 'express';
import { storage } from '../storage';

interface InstagramWebhookMessage {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    messaging: Array<{
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: {
        mid: string;
        text?: string;
        attachments?: Array<{
          type: string;
          payload: { url: string };
        }>;
        reply_to?: {
          mid: string;
        };
      };
    }>;
  }>;
}

export async function handleInstagramWebhook(req: Request, res: Response) {
  try {
    const webhookData: InstagramWebhookMessage = req.body;

    console.log('Received Instagram webhook:', JSON.stringify(webhookData, null, 2));

    // Verify this is an Instagram webhook
    if (webhookData.object !== 'instagram') {
      return res.status(400).json({ error: 'Invalid webhook object' });
    }

    // Process each entry
    for (const entry of webhookData.entry) {
      for (const messaging of entry.messaging) {
        const message = messaging.message;
        
        // Skip if no message or if it's an echo (message from our business account)
        if (!message || (message as any).is_echo) {
          console.log('Skipping echo message or empty message');
          continue;
        }

        // CRITICAL FILTERING: Only process INCOMING messages (replies from customers)
        // Check if this message is FROM a customer TO our business account
        const senderId = messaging.sender.id;
        const recipientId = messaging.recipient.id;
        
        // Find if this recipient (business account receiving the message) belongs to any of our users
        const businessAccounts = await storage.getSocialAccountsByPlatform('instagram');
        const matchingAccount = businessAccounts.find(account => 
          account.instagramBusinessId === recipientId
        );

        if (!matchingAccount) {
          console.log('Message received for unknown business account:', recipientId);
          continue;
        }

        // This is definitely a CUSTOMER REPLY to our business account
        console.log('Processing customer reply:', {
          from: senderId,
          to: recipientId,
          businessAccount: matchingAccount.username
        });

        // This is a customer reply to our business account
        await processCustomerReply({
          instagramUserId: messaging.sender.id,
          businessAccountId: messaging.recipient.id,
          messageId: message.mid,
          content: message.text,
          attachments: message.attachments?.map(att => att.payload.url) || [],
          replyToMessageId: message.reply_to?.mid,
          receivedAt: new Date(messaging.timestamp),
        });
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function processCustomerReply(replyData: {
  instagramUserId: string;
  businessAccountId: string;
  messageId: string;
  content?: string;
  attachments: string[];
  replyToMessageId?: string;
  receivedAt: Date;
}) {
  try {
    // Find the original message in our database
    // We need to match either by Instagram message ID or by business account + customer
    
    // First, try to find by the specific message they're replying to
    let originalMessage = null;
    if (replyData.replyToMessageId) {
      // Find message by Instagram message ID
      const messages = await storage.getMessagesByInstagramId(replyData.replyToMessageId);
      originalMessage = messages[0];
    }

    // If no specific reply-to message, try to find recent messages to this customer
    if (!originalMessage) {
      // This would require implementing a way to match Instagram user ID to our targets
      // For now, we'll log this as an unmatched reply
      console.log('Received reply but could not match to original message:', {
        instagramUserId: replyData.instagramUserId,
        businessAccountId: replyData.businessAccountId,
        content: replyData.content,
      });
      return;
    }

    // Store the reply
    await storage.createReply({
      messageId: originalMessage.id,
      instagramUserId: replyData.instagramUserId,
      content: replyData.content,
      attachments: replyData.attachments,
      replyToMessageId: replyData.replyToMessageId,
      receivedAt: replyData.receivedAt,
    });

    // Log the activity
    await storage.createActivityLog({
      userId: originalMessage.campaign?.userId || '',
      action: 'reply_received',
      details: `Customer replied to message in campaign "${originalMessage.campaign?.name}"`,
      metadata: {
        campaignId: originalMessage.campaignId,
        messageId: originalMessage.id,
        replyContent: replyData.content?.substring(0, 100),
      },
    });

    console.log('Successfully processed customer reply:', {
      messageId: originalMessage.id,
      campaignName: originalMessage.campaign?.name,
      replyLength: replyData.content?.length || 0,
    });

  } catch (error) {
    console.error('Error processing customer reply:', error);
  }
}

export async function verifyInstagramWebhook(req: Request, res: Response) {
  // Instagram webhook verification
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('Webhook verification request:', { mode, token, challenge });
  console.log('Expected token:', process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || 'instagram_webhook_verify_token');

  const expectedToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || 'instagram_webhook_verify_token';

  // Check if mode and token are valid
  if (mode === 'subscribe' && token === expectedToken) {
    console.log('Instagram webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.error('Instagram webhook verification failed. Expected:', expectedToken, 'Got:', token);
    res.sendStatus(403);
  }
}