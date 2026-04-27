import { RedisMemoryServer } from 'redis-memory-server';
import process from 'node:process';

async function startLocalRedis() {
  // Force the server to use the standard Redis port
  const redisServer = new RedisMemoryServer({
    instance: { port: 6379 }
  });

  const host = await redisServer.getHost();
  const port = await redisServer.getPort();

  console.log(`[REDIS] Local development server running on redis://${host}:${port}`);

  // Gracefully shut down the binary when the developer stops the dev server
  process.on('SIGINT', async () => {
    console.log('\n[REDIS] Shutting down local server...');
    await redisServer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('[REDIS] Received SIGTERM, shutting down...');
    await redisServer.stop();
    process.exit(0);
  });
}

startLocalRedis().catch(console.error);
