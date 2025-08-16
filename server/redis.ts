import Redis from 'ioredis';

let redis: Redis;

export const initializeRedis = async () => {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL environment variable is required');
  }

  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    maxLoadingTimeout: 10000,
  });

  redis.on('error', (error) => {
    console.error('Redis connection error:', error);
  });

  redis.on('connect', () => {
    console.log('✅ Redis connection established');
  });

  return redis;
};

export const getRedis = () => {
  if (!redis) {
    throw new Error('Redis not initialized. Call initializeRedis() first.');
  }
  return redis;
};

export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    const redisClient = getRedis();
    await redisClient.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
};
