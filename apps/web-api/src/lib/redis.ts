import Redis from 'ioredis';
import env from '../env';

// Create Redis client
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxLoadingTimeout: 10000,
});

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

// Helper function to get Redis key with prefix
export function getRedisKey(prefix: string, ...parts: (string | number)[]): string {
  return `${prefix}:${parts.join(':')}`;
}

// Helper function to get Redis key with date
export function getRedisKeyWithDate(prefix: string, accountId: number, date: string): string {
  return getRedisKey(prefix, accountId, date);
}

// Export Redis instance
export default redis;
