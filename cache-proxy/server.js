// Cache proxy service: handles incoming /api routes, applies caching rules, and then forwards them to the UofT backend.
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const corsOptions = require('./middleware/cors');
const cache = require('./middleware/cache');
const redisClient = require('./utils/redis');

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL;

// The cache proxy always sits in front of the third-party backend defined by this env var.
if (!BACKEND_URL) {
  console.error('ERROR: BACKEND_URL environment variable is required');
  process.exit(1);
}

// Apply CORS, JSON parsing, and form parsing so Angular can hit any endpoint that the backend uses.
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Health check
// Simple probe for orchestration and monitoring systems.
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Cache stats
// Diagnostic endpoint that streams Redis INFO for cache visibility.
app.get('/cache/stats', async (req, res) => {
  try {
    const info = await redisClient.info('stats');
    res.json({ redis_stats: info });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

// Catch-all proxy that sits in front of /api/* and replays requests to the upstream UofT API.
app.all('/api/*', async (req, res) => {
  try {
    // Check cache first
    // First check Redis for a cached response based on our cache keys.
    const cacheState = await cache.tryGet(req);
    if (cacheState.hit) {
      res.set('X-Cache', 'HIT');
      res.type('text/xml');
      return res.send(cacheState.value);
    }

    // Prepare upstream URL
    // Mirror the previous proxy: strip /api and forward to /ttb on the backend.
    const apiPath = req.originalUrl.replace(/^\/api\/?/, '');
    const backendEndpoint = `${BACKEND_URL}/ttb/${apiPath}`;
    
    // Enhanced logging for debugging
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      console.log(`[Proxy] ${req.method} -> ${backendEndpoint}`);
      console.log('  Headers:', JSON.stringify({
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length'],
        'accept': req.headers['accept']
      }, null, 2));
      console.log('  Body:', JSON.stringify(req.body, null, 2));
    } else {
      console.log(`[Proxy] ${req.method} -> ${backendEndpoint}`);
    }

    const headers = {
      Accept: req.headers['accept'] || '*/*',
      'User-Agent': req.headers['user-agent'] || 'course-checker-cache-proxy',
    };

    if (req.headers['content-type']) {
      headers['Content-Type'] = req.headers['content-type'];
    }

    // Proxy the incoming request to the upstream UofT API and capture the raw text response.
    const upstream = await axios({
      method: req.method,
      url: backendEndpoint,
      headers,
      data: (req.method === 'GET' || req.method === 'HEAD') ? undefined : req.body,
      responseType: 'text',
      validateStatus: () => true
    });

    // Store in cache if applicable and successful
    // Store successful responses so identical future calls hit Redis.
    if (cacheState.key && upstream.status >= 200 && upstream.status < 300) {
      await cache.store(cacheState.key, upstream.data);
      res.set('X-Cache', 'MISS');
    } else if (cacheState.key) {
      res.set('X-Cache', 'BYPASS');
    }

    res.set('Content-Type', upstream.headers['content-type'] || 'text/plain');
    res.status(upstream.status).send(upstream.data);
  } catch (error) {
    console.error('Backend request error:', error.message);
    res.status(502).json({
      error: 'Failed to connect to backend',
      message: error.message
    });
  }
});

// Start listening for API traffic.
app.listen(PORT, () => {
  console.log(`Cache proxy server listening on port ${PORT}`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Cache TTL: ${cache.CACHE_TTL} seconds`);
});
