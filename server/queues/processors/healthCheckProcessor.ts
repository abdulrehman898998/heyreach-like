import { Job } from 'bullmq';
import { getDatabase } from '../../db.js';
import { accounts, proxies, action_logs } from '../../../shared/schema.js';
import { eq } from 'drizzle-orm';

interface HealthCheckJobData {
  accountId?: number;
  proxyId?: number;
  checkType: 'account' | 'proxy' | 'all';
}

export const healthCheckProcessor = async (job: Job<HealthCheckJobData>) => {
  const { accountId, proxyId, checkType } = job.data;
  const db = getDatabase();

  console.log(`🏥 Processing health check job: ${checkType}`);

  try {
    if (checkType === 'all' || checkType === 'proxy') {
      await checkProxyHealth(db, proxyId);
    }

    if (checkType === 'all' || checkType === 'account') {
      await checkAccountHealth(db, accountId);
    }

    console.log(`✅ Health check completed for ${checkType}`);

  } catch (error) {
    console.error(`❌ Health check failed:`, error);
    throw error;
  }
};

async function checkProxyHealth(db: any, proxyId?: number) {
  console.log(`🔍 Checking proxy health...`);

  const whereClause = proxyId ? eq(proxies.id, proxyId) : undefined;
  const proxyList = await db.query.proxies.findMany({
    where: whereClause,
  });

  for (const proxy of proxyList) {
    try {
      // Test proxy connectivity
      const isHealthy = await testProxyConnectivity(proxy);
      
      if (!isHealthy) {
        // Mark proxy as dead
        await db.update(proxies)
          .set({
            status: 'dead',
            updated_at: new Date(),
          })
          .where(eq(proxies.id, proxy.id));

        // If proxy is assigned to an account, mark account for proxy rotation
        if (proxy.assigned_account_id) {
          await db.update(accounts)
            .set({
              status: 'needs_proxy_rotation',
              updated_at: new Date(),
            })
            .where(eq(accounts.id, proxy.assigned_account_id));
        }

        console.log(`❌ Proxy ${proxy.id} marked as dead`);
      } else {
        // Update last health check
        await db.update(proxies)
          .set({
            last_used_at: new Date(),
            updated_at: new Date(),
          })
          .where(eq(proxies.id, proxy.id));

        console.log(`✅ Proxy ${proxy.id} is healthy`);
      }

    } catch (error) {
      console.error(`❌ Error checking proxy ${proxy.id}:`, error);
    }
  }
}

async function checkAccountHealth(db: any, accountId?: number) {
  console.log(`🔍 Checking account health...`);

  const whereClause = accountId ? eq(accounts.id, accountId) : undefined;
  const accountList = await db.query.accounts.findMany({
    where: whereClause,
  });

  for (const account of accountList) {
    try {
      // Check if account needs attention
      const needsAttention = await checkAccountStatus(account);
      
      if (needsAttention) {
        await db.update(accounts)
          .set({
            status: 'needs_attention',
            updated_at: new Date(),
          })
          .where(eq(accounts.id, account.id));

        console.log(`⚠️ Account ${account.id} marked as needs attention`);
      }

      // Log health check
      await db.insert(action_logs).values({
        account_id: account.id,
        action_type: 'health_check',
        result: needsAttention ? 'needs_attention' : 'healthy',
        details: { timestamp: new Date().toISOString() },
      });

    } catch (error) {
      console.error(`❌ Error checking account ${account.id}:`, error);
    }
  }
}

async function testProxyConnectivity(proxy: any): Promise<boolean> {
  try {
    // Simple connectivity test
    const testUrl = 'https://www.instagram.com';
    const proxyUrl = `${proxy.endpoint_template}?session=health_check`;
    
    // This would be a real proxy test in production
    // For now, we'll simulate the test
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate 90% success rate
    return Math.random() > 0.1;
  } catch (error) {
    return false;
  }
}

async function checkAccountStatus(account: any): Promise<boolean> {
  // Check various account health indicators
  const now = new Date();
  
  // Check if account hasn't been used in a while
  if (account.last_login_at) {
    const daysSinceLastLogin = (now.getTime() - account.last_login_at.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastLogin > 7) {
      return true; // Needs attention
    }
  }

  // Check if account has too many failed actions recently
  const recentFailures = await getRecentFailures(account.id);
  if (recentFailures > 5) {
    return true; // Needs attention
  }

  return false;
}

async function getRecentFailures(accountId: number): Promise<number> {
  // This would query recent action logs for failures
  // For now, return a random number
  return Math.floor(Math.random() * 10);
}
