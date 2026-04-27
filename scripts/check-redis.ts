import Redis from 'ioredis';
import process from 'node:process';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: 1,
});

async function checkRedis() {
  try {
    const response = await redis.ping();
    if (response === 'PONG') {
      console.log('[REDIS-CHECK] Redis is fully responsive!');
      process.exit(0);
    }
  } catch (error) {
    console.error('[REDIS-CHECK] Redis not ready yet: ', error);
    process.exit(1);
  }
}

checkRedis();
