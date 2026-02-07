const redis = require('redis');

// Create a single shared Redis client so middleware can read/write cache entries.
const client = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10)
  }
});

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

client.on('connect', () => {
  console.log('Connected to Redis');
});

// Kick off the connection immediately so other modules can assume Redis is ready.
(async () => {
  await client.connect();
})();

module.exports = client;
