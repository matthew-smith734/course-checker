const redisClient = require('../utils/redis');
const { buildCacheKey } = require('../utils/cacheKeys');

const CACHE_TTL = parseInt(process.env.CACHE_TTL || '28800', 10); // 8 hours default

// Inspect Redis to see if this exact request has already been cached.
async function tryGet(req) {
  const cacheKey = buildCacheKey(req);
  if (!cacheKey) return { hit: false, key: undefined, value: undefined };

  const cached = await redisClient.get(cacheKey);
  if (cached !== null) {
    return { hit: true, key: cacheKey, value: cached };
  }

  return { hit: false, key: cacheKey, value: undefined };
}

// Persist a response string to Redis with a fixed TTL so repeated calls hit the cache.
async function store(key, value) {
  if (!key || typeof value === 'undefined') return;
  await redisClient.setEx(key, CACHE_TTL, value);
  console.log(`Stored in cache: ${key} (TTL: ${CACHE_TTL}s)`);
}

module.exports = {
  CACHE_TTL,
  tryGet,
  store
};
