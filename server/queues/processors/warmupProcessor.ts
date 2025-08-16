import { Job } from 'bullmq';
import { getDatabase } from '../../db.js';
import { accounts, action_logs } from '../../../shared/schema.js';
import { eq, and, gte, lte } from 'drizzle-orm';
import { EnhancedInstagramBot } from '../../automation/enhancedInstagramBot.js';
import { getWarmupQueue } from '../queueManager.js';
import { getRedis } from '../../redis.js';

interface WarmupJobData {
  accountId: number;
  actionType: 'organic' | 'trial_dm';
  targetUsername?: string;
  message?: string;
}

export const warmupProcessor = async (job: Job<WarmupJobData>) => {
  const { accountId, actionType, targetUsername, message } = job.data;
  const db = getDatabase();
  const redis = getRedis();

  console.log(`🔥 Processing warmup job for account ${accountId}, action: ${actionType}`);

  try {
    // Get account details
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, accountId),
    });

    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    // Check if account is still in warmup
    if (account.status !== 'warmup') {
      console.log(`Account ${accountId} is no longer in warmup status`);
      return;
    }

    // Check warmup timeline
    const now = new Date();
    const warmupStart = account.warmup_started_at;
    const warmupDuration = warmupStart ? now.getTime() - warmupStart.getTime() : 0;
    const warmupHours = warmupDuration / (1000 * 60 * 60);

    // AutoIGDM-style warmup: 48-72 hours
    const minWarmupHours = 48;
    const maxWarmupHours = 72;

    // Check if warmup period is complete
    if (warmupHours >= maxWarmupHours) {
      console.log(`Account ${accountId} warmup period complete (${warmupHours.toFixed(1)} hours)`);
      
      // Mark account as active
      await db.update(accounts)
        .set({
          status: 'active',
          warmup_completed_at: now,
          updated_at: now,
        })
        .where(eq(accounts.id, accountId));

      return;
    }

    // Acquire Redis lock for account
    const lockKey = `account_lock:${accountId}`;
    const lockValue = Date.now().toString();
    const lockAcquired = await redis.set(lockKey, lockValue, 'PX', 300000, 'NX'); // 5 minute lock

    if (!lockAcquired) {
      console.log(`Account ${accountId} is locked, skipping warmup job`);
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

      // Perform warmup actions based on type
      if (actionType === 'organic') {
        await performOrganicActions(bot, accountId, db);
      } else if (actionType === 'trial_dm' && targetUsername && message) {
        // Only allow trial DMs if warmup is at least 2 hours in
        if (warmupHours >= 2) {
          await performTrialDM(bot, accountId, targetUsername, message, db);
        } else {
          console.log(`Account ${accountId} too early for trial DM (${warmupHours.toFixed(1)} hours)`);
        }
      }

      // Schedule next warmup job with jitter
      const nextDelay = getRandomDelay(180, 480); // 3-8 minutes
      await getWarmupQueue().add(
        'warmup',
        { accountId, actionType: 'organic' },
        { delay: nextDelay * 1000 }
      );

      // If warmup is almost complete, schedule completion check
      if (warmupHours >= minWarmupHours && warmupHours < maxWarmupHours) {
        const remainingHours = maxWarmupHours - warmupHours;
        const completionDelay = Math.min(remainingHours * 60 * 60 * 1000, 60 * 60 * 1000); // Max 1 hour
        
                 await getWarmupQueue().add(
           'warmup',
           { accountId, actionType: 'organic' },
           { delay: completionDelay }
         );
      }

    } finally {
      // Release lock
      await redis.del(lockKey);
    }

  } catch (error) {
    console.error(`❌ Warmup job failed for account ${accountId}:`, error);
    
    // Log error
    await db.insert(action_logs).values({
      account_id: accountId,
      action_type: 'warmup',
      result: 'failed',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    throw error;
  }
};

async function performOrganicActions(bot: EnhancedInstagramBot, accountId: number, db: any) {
  console.log(`🌱 Performing organic actions for account ${accountId}`);

  try {
    // Execute warmup activities
    const results = await bot.executeWarmupActivities();
    
    // Log successful activities
    for (const result of results) {
      if (result.success) {
        await db.insert(action_logs).values({
          account_id: accountId,
          action_type: result.activityType,
          result: 'success',
          details: { message: result.message },
        });
      }
    }

    console.log(`✅ Organic actions completed for account ${accountId}`);
  } catch (error) {
    console.error(`❌ Organic actions failed for account ${accountId}:`, error);
    throw error;
  }
}

async function performTrialDM(
  bot: EnhancedInstagramBot, 
  accountId: number, 
  targetUsername: string, 
  message: string, 
  db: any
) {
  console.log(`📨 Performing trial DM to ${targetUsername} for account ${accountId}`);

  try {
    // First perform organic actions
    await performOrganicActions(bot, accountId, db);
    
    // Wait 30-180 seconds before sending DM
    const preDMDelay = Math.random() * 150000 + 30000; // 30-180 seconds
    await new Promise(resolve => setTimeout(resolve, preDMDelay));

    // Send trial DM
    const result = await bot.sendDirectMessage(`https://www.instagram.com/${targetUsername}/`, message);
    
    if (result.success) {
      await db.insert(action_logs).values({
        account_id: accountId,
        action_type: 'trial_dm',
        target: targetUsername,
        result: 'success',
        details: { message: result.message },
      });
      
      console.log(`✅ Trial DM sent successfully to ${targetUsername}`);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error(`❌ Trial DM failed for account ${accountId}:`, error);
    
    await db.insert(action_logs).values({
      account_id: accountId,
      action_type: 'trial_dm',
      target: targetUsername,
      result: 'failed',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    throw error;
  }
}

function getRandomDelay(minSeconds: number, maxSeconds: number): number {
  return Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
}
