import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import env from '../env';

// Redis connection
const redis = new Redis(env.REDIS_URL);

// Queue definitions
export const warmupQueue = new Queue('warmup', { connection: redis });
export const dmSendQueue = new Queue('dm-send', { connection: redis });
export const healthCheckQueue = new Queue('health-check', { connection: redis });

// Job types
export interface WarmupJob {
  accountId: number;
  phase: 'initial' | 'ongoing';
  scheduledAt: Date;
}

export interface DMSendJob {
  accountId: number;
  leadId: number;
  campaignId: number;
  messageBody: string;
  profileUrl: string;
}

export interface HealthCheckJob {
  proxyId?: number;
  accountId?: number;
}

// Queue helpers
export async function scheduleWarmupJob(data: WarmupJob, delay?: number) {
  return await warmupQueue.add('warmup-session', data, {
    delay: delay || 0,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 30000, // 30 seconds
    },
  });
}

export async function scheduleDMSendJob(data: DMSendJob, delay?: number) {
  return await dmSendQueue.add('send-dm', data, {
    delay: delay || 0,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000, // 1 minute
    },
  });
}

export async function scheduleHealthCheckJob(data: HealthCheckJob) {
  return await healthCheckQueue.add('health-check', data, {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 30000,
    },
  });
}

// Cleanup function
export async function closeQueues() {
  await warmupQueue.close();
  await dmSendQueue.close();
  await healthCheckQueue.close();
  await redis.disconnect();
}
