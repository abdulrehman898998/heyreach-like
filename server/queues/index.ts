import { Queue, Worker } from 'bullmq';
import { getRedis } from '../redis.js';
import { warmupProcessor } from './processors/warmupProcessor.js';
import { dmSendProcessor } from './processors/dmSendProcessor.js';
import { healthCheckProcessor } from './processors/healthCheckProcessor.js';
import { mcpProcessor } from './processors/mcpProcessor.js';
import { maintenanceProcessor } from './processors/maintenanceProcessor.js';

// Queue names
export const QUEUE_NAMES = {
  WARMUP: 'warmup',
  DM_SEND: 'dmSend',
  HEALTH_CHECK: 'healthCheck',
  MCP: 'mcp',
  MAINTENANCE: 'maintenance',
} as const;

// Create queues
export const warmupQueue = new Queue(QUEUE_NAMES.WARMUP, {
  connection: getRedis(),
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const dmSendQueue = new Queue(QUEUE_NAMES.DM_SEND, {
  connection: getRedis(),
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export const healthCheckQueue = new Queue(QUEUE_NAMES.HEALTH_CHECK, {
  connection: getRedis(),
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  },
});

export const mcpQueue = new Queue(QUEUE_NAMES.MCP, {
  connection: getRedis(),
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 30000,
    },
  },
});

export const maintenanceQueue = new Queue(QUEUE_NAMES.MAINTENANCE, {
  connection: getRedis(),
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 1,
  },
});

// Create workers
export const warmupWorker = new Worker(QUEUE_NAMES.WARMUP, warmupProcessor, {
  connection: getRedis(),
  concurrency: 2,
});

export const dmSendWorker = new Worker(QUEUE_NAMES.DM_SEND, dmSendProcessor, {
  connection: getRedis(),
  concurrency: 3,
});

export const healthCheckWorker = new Worker(QUEUE_NAMES.HEALTH_CHECK, healthCheckProcessor, {
  connection: getRedis(),
  concurrency: 1,
});

export const mcpWorker = new Worker(QUEUE_NAMES.MCP, mcpProcessor, {
  connection: getRedis(),
  concurrency: 1,
});

export const maintenanceWorker = new Worker(QUEUE_NAMES.MAINTENANCE, maintenanceProcessor, {
  connection: getRedis(),
  concurrency: 1,
});

// Note: QueueScheduler removed due to import issues - delayed jobs will still work

// Worker event handlers
warmupWorker.on('completed', (job) => {
  console.log(`✅ Warmup job ${job.id} completed for account ${job.data.accountId}`);
});

warmupWorker.on('failed', (job, err) => {
  console.error(`❌ Warmup job ${job?.id} failed:`, err);
});

dmSendWorker.on('completed', (job) => {
  console.log(`✅ DM send job ${job.id} completed for account ${job.data.accountId}`);
});

dmSendWorker.on('failed', (job, err) => {
  console.error(`❌ DM send job ${job?.id} failed:`, err);
});

healthCheckWorker.on('completed', (job) => {
  console.log(`✅ Health check job ${job.id} completed`);
});

healthCheckWorker.on('failed', (job, err) => {
  console.error(`❌ Health check job ${job?.id} failed:`, err);
});

mcpWorker.on('completed', (job) => {
  console.log(`✅ MCP job ${job.id} completed`);
});

mcpWorker.on('failed', (job, err) => {
  console.error(`❌ MCP job ${job?.id} failed:`, err);
});

maintenanceWorker.on('completed', (job) => {
  console.log(`✅ Maintenance job ${job.id} completed`);
});

maintenanceWorker.on('failed', (job, err) => {
  console.error(`❌ Maintenance job ${job?.id} failed:`, err);
});

// Graceful shutdown
export const closeQueues = async () => {
  await warmupWorker.close();
  await dmSendWorker.close();
  await healthCheckWorker.close();
  await mcpWorker.close();
  await maintenanceWorker.close();
  
  await warmupQueue.close();
  await dmSendQueue.close();
  await healthCheckQueue.close();
  await mcpQueue.close();
  await maintenanceQueue.close();
  
  console.log('✅ All queues closed');
};
