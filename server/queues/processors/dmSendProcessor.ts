import { Job } from 'bullmq';
import { getDatabase } from '../../db.js';
import { accounts, messages, action_logs, leads, campaigns } from '../../../shared/schema.js';
import { eq, and, gte, lte } from 'drizzle-orm';
import { EnhancedInstagramBot } from '../../automation/enhancedInstagramBot.js';
import { getRedis } from '../../redis.js';
import { getMcpQueue } from '../queueManager.js';

interface DMSendJobData {
  accountId: number;
  messageId: number;
  leadId: number;
  campaignId: number;
}

export const dmSendProcessor = async (job: Job<DMSendJobData>) => {
  const { accountId, messageId, leadId, campaignId } = job.data;
  const db = getDatabase();
  const redis = getRedis();

  console.log(`📨 Processing DM send job for account ${accountId}, message ${messageId}`);

  try {
    // Get account details
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, accountId),
    });

    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    // Check if account is active
    if (account.status !== 'active') {
      throw new Error(`Account ${accountId} is not active (status: ${account.status})`);
    }

    // Check daily message limit
    const now = new Date();
    const lastReset = account.last_msg_reset_at;
    const shouldReset = !lastReset || 
      now.getDate() !== lastReset.getDate() || 
      now.getMonth() !== lastReset.getMonth() || 
      now.getFullYear() !== lastReset.getFullYear();

    if (shouldReset) {
      // Reset daily count
      await db.update(accounts)
        .set({
          daily_msg_count: 0,
          last_msg_reset_at: now,
          updated_at: now,
        })
        .where(eq(accounts.id, accountId));
    } else if (account.daily_msg_count >= account.daily_msg_limit) {
      throw new Error(`Account ${accountId} has reached daily message limit (${account.daily_msg_limit})`);
    }

    // Get message and lead details
    const message = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
    });

    const lead = await db.query.leads.findFirst({
      where: eq(leads.id, leadId),
    });

    if (!message || !lead) {
      throw new Error(`Message ${messageId} or lead ${leadId} not found`);
    }

    // Check if message is still pending
    if (message.status !== 'pending') {
      console.log(`Message ${messageId} is not pending (status: ${message.status})`);
      return;
    }

    // Acquire Redis lock for account
    const lockKey = `account_lock:${accountId}`;
    const lockValue = Date.now().toString();
    const lockAcquired = await redis.set(lockKey, lockValue, 'PX', 300000, 'NX'); // 5 minute lock

    if (!lockAcquired) {
      console.log(`Account ${accountId} is locked, skipping DM send job`);
      return;
    }

    try {
      // Initialize Instagram bot
      const bot = new EnhancedInstagramBot({
        headless: process.env.PLAYWRIGHT_HEADLESS === 'true',
        proxy: account.assigned_proxy_id ? {
          server: `http://proxy-${account.assigned_proxy_id}.provider.com:8000?session=${account.session_label}`,
        } : undefined,
      });

      // Perform parallel organic actions before sending DM
      await performParallelOrganicActions(bot, accountId, db);

      // Wait 30-180 seconds before sending DM
      const preDMDelay = Math.random() * 150000 + 30000; // 30-180 seconds
      await new Promise(resolve => setTimeout(resolve, preDMDelay));

      // Send DM
      const result = await sendDM(bot, accountId, lead.profile_url, message.body_resolved, db);

      if (result.success) {
        // Update message status
        await db.update(messages)
          .set({
            status: 'sent',
            sent_at: now,
            updated_at: now,
          })
          .where(eq(messages.id, messageId));

        // Increment daily message count
        await db.update(accounts)
          .set({
            daily_msg_count: account.daily_msg_count + 1,
            updated_at: now,
          })
          .where(eq(accounts.id, accountId));

        console.log(`✅ DM sent successfully to ${lead.profile_url}`);
      } else {
        throw new Error(result.message);
      }

    } finally {
      // Release lock
      await redis.del(lockKey);
    }

  } catch (error) {
    console.error(`❌ DM send job failed for account ${accountId}:`, error);
    
    // Update message status to failed
    await db.update(messages)
      .set({
        status: 'failed',
        error_code: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date(),
      })
      .where(eq(messages.id, messageId));

    // Log error
    await db.insert(action_logs).values({
      account_id: accountId,
      action_type: 'dm_send',
      result: 'failed',
      details: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        messageId,
        leadId,
      },
    });

    // If it's a selector failure, queue MCP job
    if (error instanceof Error && error.message.includes('selector')) {
              await getMcpQueue().add('mcp', {
        accountId,
        actionType: 'dm_send',
        targetUrl: lead?.profile_url,
        error: error.message,
      });
    }

    throw error;
  }
};

async function performParallelOrganicActions(bot: EnhancedInstagramBot, accountId: number, db: any) {
  console.log(`🌱 Performing parallel organic actions for account ${accountId}`);

  try {
    // Randomly choose 1-3 organic actions
    const actionTypes = ['visit_profile', 'follow', 'like', 'view_story', 'scroll_feed'];
    const numActions = Math.floor(Math.random() * 3) + 1; // 1-3 actions
    const selectedActions = shuffleArray(actionTypes).slice(0, numActions);

    for (const actionType of selectedActions) {
      try {
        switch (actionType) {
          case 'visit_profile':
            await visitRandomProfile(bot, accountId, db);
            break;
          case 'follow':
            await followRandomUser(bot, accountId, db);
            break;
          case 'like':
            await likeRandomPost(bot, accountId, db);
            break;
          case 'view_story':
            await viewRandomStory(bot, accountId, db);
            break;
          case 'scroll_feed':
            await scrollFeed(bot, accountId, db);
            break;
        }

        // Wait 15-45 seconds between actions
        const delay = Math.random() * 30000 + 15000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (error) {
        console.log(`⚠️ Organic action ${actionType} failed:`, error);
      }
    }

    console.log(`✅ Parallel organic actions completed for account ${accountId}`);
  } catch (error) {
    console.error(`❌ Parallel organic actions failed for account ${accountId}:`, error);
    throw error;
  }
}

async function sendDM(bot: EnhancedInstagramBot, accountId: number, profileUrl: string, message: string, db: any) {
  console.log(`📨 Sending DM to ${profileUrl} for account ${accountId}`);

  try {
    const result = await bot.sendDirectMessage(profileUrl, message);
    
    if (result.success) {
      await db.insert(action_logs).values({
        account_id: accountId,
        action_type: 'dm_send',
        target: profileUrl,
        result: 'success',
        details: { message: result.message },
      });
    }

    return result;
  } catch (error) {
    console.error(`❌ DM send failed for account ${accountId}:`, error);
    throw error;
  }
}

async function visitRandomProfile(bot: EnhancedInstagramBot, accountId: number, db: any) {
  // Navigate to a random profile (implementation depends on bot capabilities)
  await bot.navigateToHome();
  // Add logic to find and visit a random profile
}

async function followRandomUser(bot: EnhancedInstagramBot, accountId: number, db: any) {
  const followedCount = await bot.followSuggestedUsers(1);
  if (followedCount > 0) {
    await db.insert(action_logs).values({
      account_id: accountId,
      action_type: 'follow',
      result: 'success',
      details: { count: followedCount },
    });
  }
}

async function likeRandomPost(bot: EnhancedInstagramBot, accountId: number, db: any) {
  const likedCount = await bot.likeRecentPosts(1);
  if (likedCount > 0) {
    await db.insert(action_logs).values({
      account_id: accountId,
      action_type: 'like',
      result: 'success',
      details: { count: likedCount },
    });
  }
}

async function viewRandomStory(bot: EnhancedInstagramBot, accountId: number, db: any) {
  await bot.viewStories();
  await db.insert(action_logs).values({
    account_id: accountId,
    action_type: 'view_story',
    result: 'success',
    details: { message: 'Viewed random story' },
  });
}

async function scrollFeed(bot: EnhancedInstagramBot, accountId: number, db: any) {
  await bot.scrollFeed(1);
  await db.insert(action_logs).values({
    account_id: accountId,
    action_type: 'scroll_feed',
    result: 'success',
    details: { message: 'Scrolled feed' },
  });
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
