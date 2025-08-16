import { Job } from 'bullmq';
import { getDatabase } from '../../db.js';
import { accounts, action_logs, selector_registry } from '../../../shared/schema.js';
import { sql } from 'drizzle-orm';

interface MaintenanceJobData {
  taskType: 'daily_reset' | 'cleanup' | 'all';
}

export const maintenanceProcessor = async (job: Job<MaintenanceJobData>) => {
  const { taskType } = job.data;
  const db = getDatabase();

  console.log(`🔧 Processing maintenance job: ${taskType}`);

  try {
    if (taskType === 'all' || taskType === 'daily_reset') {
      await resetDailyCounters(db);
    }

    if (taskType === 'all' || taskType === 'cleanup') {
      await cleanupOldData(db);
    }

    console.log(`✅ Maintenance completed for ${taskType}`);

  } catch (error) {
    console.error(`❌ Maintenance failed:`, error);
    throw error;
  }
};

async function resetDailyCounters(db: any) {
  console.log(`🔄 Resetting daily counters...`);

  const now = new Date();
  
  // Reset daily message counts for all accounts
  await db.update(accounts)
    .set({
      daily_msg_count: 0,
      last_msg_reset_at: now,
      updated_at: now,
    })
    .where(sql`last_msg_reset_at IS NULL OR DATE(last_msg_reset_at) < DATE(${now})`);

  console.log(`✅ Daily counters reset`);
}

async function cleanupOldData(db: any) {
  console.log(`🧹 Cleaning up old data...`);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Clean up old action logs (keep last 30 days)
  await db.delete(action_logs)
    .where(sql`created_at < ${thirtyDaysAgo}`);

  // Clean up old selector registry entries with low scores
  await db.delete(selector_registry)
    .where(sql`score < 0.3 AND last_success_at < ${thirtyDaysAgo}`);

  // Clean up expired sessions (accounts that haven't been used in 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  await db.update(accounts)
    .set({
      status: 'inactive',
      updated_at: new Date(),
    })
    .where(sql`last_login_at < ${sevenDaysAgo} AND status = 'active'`);

  console.log(`✅ Old data cleaned up`);
}
