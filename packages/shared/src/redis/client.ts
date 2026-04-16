import Redis from 'ioredis';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL environment variable is required');
    }
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
    });

    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('Redis connected');
    });
  }
  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export const CACHE_KEYS = {
  linkRedirect: (shortCode: string) => `link:${shortCode}`,
  showData: (showId: string) => `show:${showId}`,
  showStats: (showId: string) => `show:${showId}:stats`,
  orgData: (orgId: string) => `org:${orgId}`,
  userSession: (token: string) => `session:${token}`,
  rateLimit: (ip: string, endpoint: string) => `rl:${ip}:${endpoint}`,
} as const;

export const CACHE_TTL = {
  linkRedirect: 3600,      // 1 hour
  showData: 30,            // 30 seconds
  showStats: 60,           // 1 minute
  orgData: 300,            // 5 minutes
  userSession: 86400,      // 24 hours
} as const;
