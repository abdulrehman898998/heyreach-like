import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { db, schema } from '../lib/drizzle';
import { AccountWarmup } from '../lib/accountWarmup';
import { WarmupJob } from '../lib/queues';
import { eq, and } from 'drizzle-orm';
import env from '../env';

const redis = new Redis(env.REDIS_URL);

// Warmup worker
export const warmupWorker = new Worker(
  'warmup',
  async (job: Job<WarmupJob>) => {
    const { accountId, phase } = job.data;
    
    console.log(`🔥 Processing warmup job for account ${accountId} (phase: ${phase})`);

    try {
      // Get account with proxy information
      const account = await db.query.accounts.findFirst({
        where: eq(schema.accounts.id, accountId),
        with: {
          proxy: true,
        },
      });

      if (!account) {
        throw new Error(`Account ${accountId} not found`);
      }

      if (account.status !== 'warming' && account.status !== 'active') {
        console.log(`⚠️ Skipping warmup - account ${accountId} status: ${account.status}`);
        return;
      }

      // Convert to warmup format
      const warmupAccount = {
        id: account.id,
        username: account.username,
        home_country: account.home_country,
        home_city: account.home_city,
        assigned_proxy_id: account.assigned_proxy_id,
        session_label: account.session_label,
        cookies_encrypted: account.cookies_encrypted,
        status: account.status,
      };

      // Convert proxy if available
      const proxyConfig = account.proxy ? {
        server: account.proxy.endpoint_template,
        username: account.proxy.username,
        password: account.proxy.password,
        country: account.proxy.country,
        ip_type: account.proxy.ip_type,
      } : null;

      // Run warmup session
      const warmup = new AccountWarmup(warmupAccount, proxyConfig);
      await warmup.runWarmupSession(phase);

      // Update account last activity
      await db.update(schema.accounts)
        .set({ 
          updated_at: new Date(),
          last_login_at: new Date(),
        })
        .where(eq(schema.accounts.id, accountId));

      // Calculate and update warmup progress
      if (account.warmup_started_at && account.status === 'warming') {
        const warmupDuration = Date.now() - new Date(account.warmup_started_at).getTime();
        const totalWarmupTime = 48 * 60 * 60 * 1000; // 48 hours
        const progress = Math.min(Math.floor((warmupDuration / totalWarmupTime) * 100), 100);
        
        await db.update(schema.accounts)
          .set({ 
            warmup_progress: progress,
            updated_at: new Date(),
          })
          .where(eq(schema.accounts.id, accountId));
        
        console.log(`📊 Account ${accountId} warmup progress: ${progress}%`);
      }

      // Check if warmup is complete
      if (phase === 'ongoing' && account.warmup_started_at) {
        const warmupDuration = Date.now() - new Date(account.warmup_started_at).getTime();
        const isWarmupComplete = warmupDuration > (48 * 60 * 60 * 1000); // 48 hours
        
        if (isWarmupComplete && account.status === 'warming') {
          await db.update(schema.accounts)
            .set({ 
              status: 'active',
              warmup_completed_at: new Date(),
              warmup_progress: 100,
            })
            .where(eq(schema.accounts.id, accountId));
          
          console.log(`✅ Account ${accountId} warmup completed - marked as active`);
        }
      }

      console.log(`✅ Warmup job completed for account ${accountId}`);

    } catch (error) {
      console.error(`❌ Warmup job failed for account ${accountId}:`, error);
      
      // Update account risk score
      await db.update(schema.accounts)
        .set({ 
          risk_score: db.select({ risk_score: schema.accounts.risk_score })
            .from(schema.accounts)
            .where(eq(schema.accounts.id, accountId))
            .then(result => (result[0]?.risk_score || 0) + 20)
        })
        .where(eq(schema.accounts.id, accountId));
      
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 2, // Process 2 warmup jobs at a time
    limiter: {
      max: 5, // Max 5 jobs per minute
      duration: 60000,
    },
  }
);

// DM Send worker
export const dmSendWorker = new Worker(
  'dm-send',
  async (job: Job) => {
    const { accountId, leadId, campaignId, messageBody, profileUrl } = job.data;
    
    console.log(`💬 Processing DM job: account ${accountId} -> lead ${leadId}`);

    try {
      // Get account with proxy
      const account = await db.query.accounts.findFirst({
        where: eq(schema.accounts.id, accountId),
        with: { proxy: true },
      });

      if (!account || account.status !== 'active') {
        throw new Error(`Account ${accountId} not available for DM sending`);
      }

      // Check daily message limit
      const today = new Date().toISOString().split('T')[0];
      const messagesCount = await db.select({ count: schema.messages.id })
        .from(schema.messages)
        .where(and(
          eq(schema.messages.account_id, accountId),
          eq(schema.messages.created_at, new Date()) // Simplified - should check daily range
        ));

      if (messagesCount.length >= account.daily_msg_limit) {
        console.log(`⚠️ Daily message limit reached for account ${accountId}`);
        return;
      }

      // Convert account format
      const warmupAccount = {
        id: account.id,
        username: account.username,
        home_country: account.home_country,
        home_city: account.home_city,
        assigned_proxy_id: account.assigned_proxy_id,
        session_label: account.session_label,
        cookies_encrypted: account.cookies_encrypted,
        status: account.status,
      };

      const proxyConfig = account.proxy ? {
        server: account.proxy.endpoint_template,
        username: account.proxy.username,
        password: account.proxy.password,
        country: account.proxy.country,
        ip_type: account.proxy.ip_type,
      } : null;

      // Initialize warmup class for DM sending
      const warmup = new AccountWarmup(warmupAccount, proxyConfig);
      await warmup.initialize();

      // Perform some organic actions first
      await warmup.performNaturalBrowsing();
      await warmup.likeSomePosts();

      // Send the DM
      const success = await warmup.sendDirectMessage(profileUrl, messageBody);
      
      // Record message in database
      await db.insert(schema.messages).values({
        campaign_id: campaignId,
        account_id: accountId,
        lead_id: leadId,
        body_resolved: messageBody,
        status: success ? 'sent' : 'failed',
        sent_at: success ? new Date() : null,
        attempts: 1,
      });

      // Update lead status
      await db.update(schema.leads)
        .set({ status: success ? 'sent' : 'failed' })
        .where(eq(schema.leads.id, leadId));

      // Update daily message count
      await db.update(schema.accounts)
        .set({ 
          daily_msg_count: account.daily_msg_count + 1,
          updated_at: new Date(),
        })
        .where(eq(schema.accounts.id, accountId));

      await warmup.close();

      console.log(`${success ? '✅' : '❌'} DM job completed: account ${accountId} -> lead ${leadId}`);

    } catch (error) {
      console.error(`❌ DM job failed: account ${accountId} -> lead ${leadId}:`, error);
      
      // Record failed message
      await db.insert(schema.messages).values({
        campaign_id: campaignId,
        account_id: accountId,
        lead_id: leadId,
        body_resolved: messageBody,
        status: 'failed',
        error_code: 'AUTOMATION_ERROR',
        attempts: 1,
      });

      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 1, // Process DM jobs one at a time
    limiter: {
      max: 10, // Max 10 DMs per minute across all accounts
      duration: 60000,
    },
  }
);

// Error handlers
warmupWorker.on('failed', (job, err) => {
  console.error(`Warmup job ${job?.id} failed:`, err);
});

dmSendWorker.on('failed', (job, err) => {
  console.error(`DM job ${job?.id} failed:`, err);
});

// Success handlers
warmupWorker.on('completed', (job) => {
  console.log(`✅ Warmup job ${job.id} completed`);
});

dmSendWorker.on('completed', (job) => {
  console.log(`✅ DM job ${job.id} completed`);
});

export { warmupWorker, dmSendWorker };
