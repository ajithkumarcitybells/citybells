import Redis from 'ioredis';

let client: Redis | null = null;

export function getRedis() {
  if (client) return client;
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("Redis not configured, using fallback");
    return null;
  }
  client = new Redis(url);
  client.on('error', (e) => console.error('Redis error', e));
  return client;
}

export default getRedis;
