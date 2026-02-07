# Express Cache Proxy Implementation Guide

## Overview

This document outlines the changes needed to replace your existing Angular proxy with an Express-based caching proxy that handles CORS and implements intelligent caching with Redis.

## Architecture

```
Angular Container → Express Cache Proxy Container → Third-party Backend
                            ↓
                     Redis Container
```

### Key Features
- CORS header management
- Intelligent caching with individual item storage
- 8-hour cache TTL
- Comma-separated value handling with individual caching

## Container Configuration

### 1. Docker Compose Setup

Create or modify `docker-compose.yml`:

```yaml
version: '3.8'

services:
  angular-frontend:
    build: ./angular-app
    ports:
      - "4200:4200"
    environment:
      - API_PROXY_URL=http://cache-proxy:3000
    depends_on:
      - cache-proxy

  cache-proxy:
    build: ./cache-proxy
    ports:
      - "3000:3000"
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - BACKEND_URL=https://third-party-backend.com
      - CACHE_TTL=28800  # 8 hours in seconds
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

## Express Cache Proxy Implementation

### 2. Project Structure

Create a new directory `cache-proxy/` with the following structure:

```
cache-proxy/
├── Dockerfile
├── package.json
├── server.js
├── middleware/
│   ├── cors.js
│   └── cache.js
└── utils/
    ├── redis.js
    └── requestNormalizer.js
```

### 3. Package Dependencies

Create `cache-proxy/package.json`:

```json
{
  "name": "cache-proxy",
  "version": "1.0.0",
  "description": "Caching proxy with CORS support",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0",
    "redis": "^4.6.0",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2"
  }
}
```

### 4. Dockerfile

Create `cache-proxy/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

### 5. Redis Client Setup

Create `cache-proxy/utils/redis.js`:

```javascript
const redis = require('redis');

const client = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379
  }
});

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

client.on('connect', () => {
  console.log('Connected to Redis');
});

// Initialize connection
(async () => {
  await client.connect();
})();

module.exports = client;
```

### 6. Request Normalizer

Create `cache-proxy/utils/requestNormalizer.js`:

```javascript
/**
 * Normalizes comma-separated values and generates cache keys
 * for individual items and combinations
 */
class RequestNormalizer {
  
  /**
   * Parse and normalize a comma-separated string
   * @param {string} value - Comma-separated string (e.g., "C,B,A")
   * @returns {Array} - Sorted, trimmed, deduplicated array
   */
  static parseCommaSeparated(value) {
    if (!value || typeof value !== 'string') {
      return [];
    }
    
    return value
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .filter((item, index, self) => self.indexOf(item) === index) // Remove duplicates
      .sort(); // Sort for consistent cache keys
  }

  /**
   * Generate a cache key for a single item
   * @param {string} item - Single item value
   * @param {string} otherField - Value of the other field
   * @returns {string} - Cache key
   */
  static generateSingleItemKey(item, otherField) {
    return `cache:${otherField}:${item}`;
  }

  /**
   * Generate cache keys for all items in a request
   * @param {Array} items - Normalized array of items
   * @param {string} otherField - Value of the other field
   * @returns {Array} - Array of cache keys
   */
  static generateCacheKeys(items, otherField) {
    return items.map(item => this.generateSingleItemKey(item, otherField));
  }

  /**
   * Create a unique hash for the full request
   * Used for identifying identical multi-item requests
   * @param {Array} items - Sorted, normalized items
   * @param {string} otherField - Value of the other field
   * @returns {string}
   */
  static generateRequestHash(items, otherField) {
    return `request:${otherField}:${items.join(',')}`;
  }
}

module.exports = RequestNormalizer;
```

### 7. Cache Middleware

Create `cache-proxy/middleware/cache.js`:

```javascript
const redisClient = require('../utils/redis');
const RequestNormalizer = require('../utils/requestNormalizer');

const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 28800; // 8 hours default

/**
 * Cache middleware for handling request/response caching
 */
class CacheMiddleware {

  /**
   * Check cache for all items in the request
   * Returns partial results if some items are cached
   */
  static async checkCache(req, res, next) {
    try {
      const { commaSeparatedField, otherField } = req.body;
      
      // Parse and normalize the comma-separated field
      const items = RequestNormalizer.parseCommaSeparated(commaSeparatedField);
      
      if (items.length === 0) {
        return next(); // No items to cache, proceed to backend
      }

      // Generate cache keys for all items
      const cacheKeys = RequestNormalizer.generateCacheKeys(items, otherField);
      
      // Check cache for all items
      const cachedValues = await Promise.all(
        cacheKeys.map(key => redisClient.get(key))
      );

      // Separate cached and uncached items
      const results = [];
      const uncachedItems = [];
      
      items.forEach((item, index) => {
        if (cachedValues[index]) {
          results.push(JSON.parse(cachedValues[index]));
          console.log(`Cache HIT: ${cacheKeys[index]}`);
        } else {
          uncachedItems.push(item);
          console.log(`Cache MISS: ${cacheKeys[index]}`);
        }
      });

      // If all items were cached, return immediately
      if (uncachedItems.length === 0) {
        console.log('All items found in cache');
        return res.json({
          data: results,
          source: 'cache'
        });
      }

      // Store partial results and uncached items for later
      req.cacheState = {
        cachedResults: results,
        uncachedItems: uncachedItems,
        otherField: otherField,
        allItems: items
      };

      // Modify request body to only include uncached items
      req.body.commaSeparatedField = uncachedItems.join(',');
      
      next();
      
    } catch (error) {
      console.error('Cache check error:', error);
      next(); // On error, proceed without cache
    }
  }

  /**
   * Store response data in cache
   * Handles both individual items and combined results
   */
  static async storeCache(req, backendResponse) {
    try {
      const { cacheState } = req;
      
      if (!cacheState) {
        return; // No cache state, nothing to store
      }

      const { uncachedItems, otherField } = cacheState;

      // Assuming backend returns array of results matching uncached items
      if (Array.isArray(backendResponse.data)) {
        const storePromises = [];

        backendResponse.data.forEach((result, index) => {
          const item = uncachedItems[index];
          const cacheKey = RequestNormalizer.generateSingleItemKey(item, otherField);
          
          storePromises.push(
            redisClient.setEx(
              cacheKey,
              CACHE_TTL,
              JSON.stringify(result)
            )
          );
          
          console.log(`Stored in cache: ${cacheKey} (TTL: ${CACHE_TTL}s)`);
        });

        await Promise.all(storePromises);
      }
      
    } catch (error) {
      console.error('Cache storage error:', error);
      // Don't throw - caching failures shouldn't break the response
    }
  }

  /**
   * Combine cached and fresh results
   */
  static combineResults(req, backendResponse) {
    const { cacheState } = req;
    
    if (!cacheState || cacheState.cachedResults.length === 0) {
      return backendResponse;
    }

    return {
      data: [...cacheState.cachedResults, ...backendResponse.data],
      source: 'mixed',
      cached_count: cacheState.cachedResults.length,
      fresh_count: backendResponse.data.length
    };
  }
}

module.exports = CacheMiddleware;
```

### 8. CORS Middleware

Create `cache-proxy/middleware/cors.js`:

```javascript
/**
 * CORS configuration middleware
 * Adjust these settings to match your backend's requirements
 */

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Add your allowed origins here
    const allowedOrigins = [
      'http://localhost:4200',
      'http://angular-frontend:4200'
      // Add production frontend URL here
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    // Add any custom headers your backend requires
  ]
};

module.exports = corsOptions;
```

### 9. Main Server

Create `cache-proxy/server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const corsOptions = require('./middleware/cors');
const CacheMiddleware = require('./middleware/cache');

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL;

if (!BACKEND_URL) {
  console.error('ERROR: BACKEND_URL environment variable is required');
  process.exit(1);
}

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Cache statistics endpoint (optional)
app.get('/cache/stats', async (req, res) => {
  try {
    const redisClient = require('./utils/redis');
    const info = await redisClient.info('stats');
    res.json({ redis_stats: info });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

// Main proxy endpoint
app.post('/api/*', CacheMiddleware.checkCache, async (req, res) => {
  try {
    // Extract the API path
    const apiPath = req.path.replace('/api/', '');
    const backendEndpoint = `${BACKEND_URL}/${apiPath}`;

    console.log(`Forwarding to backend: ${backendEndpoint}`);
    
    // Forward request to backend
    const backendResponse = await axios.post(backendEndpoint, req.body, {
      headers: {
        'Content-Type': 'application/json',
        // Add any additional headers required by your backend
      }
    });

    // Store fresh results in cache
    await CacheMiddleware.storeCache(req, backendResponse.data);

    // Combine cached and fresh results
    const combinedResponse = CacheMiddleware.combineResults(req, backendResponse.data);

    res.json(combinedResponse);

  } catch (error) {
    console.error('Backend request error:', error.message);
    
    if (error.response) {
      // Backend returned an error
      res.status(error.response.status).json({
        error: error.response.data,
        source: 'backend'
      });
    } else {
      // Network or other error
      res.status(500).json({
        error: 'Failed to connect to backend',
        message: error.message
      });
    }
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Cache proxy server listening on port ${PORT}`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Cache TTL: ${process.env.CACHE_TTL || 28800} seconds (8 hours)`);
});
```

## Angular Application Changes

### 10. Update Angular Environment

Modify your Angular environment files to point to the cache proxy instead of the backend directly.

**src/environments/environment.ts:**

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'  // Changed from direct backend URL
};
```

**src/environments/environment.prod.ts:**

```typescript
export const environment = {
  production: true,
  apiUrl: 'http://cache-proxy:3000/api'  // Docker service name
};
```

### 11. Remove Old Proxy Configuration

Since the Express proxy now handles CORS, you can remove your existing proxy configuration from the Angular app.

**Delete or comment out:**
- Any `proxy.conf.json` files
- Proxy-related configuration in `angular.json`
- Any startup scripts that reference the proxy

### 12. Update Angular Service

Ensure your Angular service is using the updated API URL:

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  
  constructor(private http: HttpClient) {}

  submitData(commaSeparatedField: string, otherField: string) {
    return this.http.post(`${environment.apiUrl}/your-endpoint`, {
      commaSeparatedField,
      otherField
    });
  }
}
```

## Deployment Steps

### 13. Build and Deploy

1. **Build the cache proxy container:**
   ```bash
   cd cache-proxy
   docker build -t cache-proxy:latest .
   ```

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **Verify services are running:**
   ```bash
   docker-compose ps
   ```

4. **Check logs:**
   ```bash
   docker-compose logs -f cache-proxy
   docker-compose logs -f redis
   ```

### 14. Testing

**Test the cache proxy health:**
```bash
curl http://localhost:3000/health
```

**Test a simple request:**
```bash
curl -X POST http://localhost:3000/api/your-endpoint \
  -H "Content-Type: application/json" \
  -d '{"commaSeparatedField": "A,B,C", "otherField": "test"}'
```

**Verify caching behavior:**
1. Make the same request twice
2. Check the response - the second should indicate cached data
3. Check Redis: `docker exec -it <redis-container> redis-cli KEYS "*"`

## Cache Key Strategy

The implementation uses the following cache key pattern:

```
cache:{otherField}:{singleItem}
```

**Examples:**
- Request: `{commaSeparatedField: "A,B,C", otherField: "user123"}`
- Cache keys created:
  - `cache:user123:A`
  - `cache:user123:B`
  - `cache:user123:C`

**Behavior:**
- First request with "A,B,C" → 3 backend calls, 3 cache entries created
- Second request with "A,B" → 2 cache hits, 0 backend calls
- Third request with "A,D" → 1 cache hit (A), 1 backend call (D)
- Request with "C,B,A" → Same as "A,B,C" due to normalization

## Monitoring and Maintenance

### 15. Log Management

Add logging to track cache performance:

```javascript
// Add to server.js
let cacheHits = 0;
let cacheMisses = 0;

// Update in CacheMiddleware
console.log(`Cache hit rate: ${(cacheHits/(cacheHits+cacheMisses)*100).toFixed(2)}%`);
```

### 16. Redis Monitoring

Monitor Redis with:
```bash
docker exec -it <redis-container> redis-cli INFO stats
docker exec -it <redis-container> redis-cli DBSIZE
```

### 17. Cache Invalidation (Future Enhancement)

To add cache invalidation later, create an admin endpoint:

```javascript
// Add to server.js
app.delete('/admin/cache/:pattern', async (req, res) => {
  const pattern = req.params.pattern;
  const keys = await redisClient.keys(pattern);
  await Promise.all(keys.map(key => redisClient.del(key)));
  res.json({ deleted: keys.length, keys });
});
```

## Troubleshooting

### Common Issues

1. **Redis connection fails:**
   - Verify Redis container is running: `docker-compose ps`
   - Check network connectivity between containers
   - Verify REDIS_HOST environment variable

2. **CORS errors persist:**
   - Check `allowedOrigins` in `cors.js`
   - Verify Angular app origin matches allowed list
   - Check browser console for specific CORS error

3. **Cache not working:**
   - Verify Redis is accepting connections
   - Check cache middleware logs
   - Verify CACHE_TTL is set correctly

4. **Backend requests failing:**
   - Verify BACKEND_URL is correct
   - Check backend logs for errors
   - Verify backend accepts requests from proxy IP

## Summary

This implementation provides:
- ✅ Separate cache proxy container
- ✅ CORS handling
- ✅ Individual item caching (A, B, C stored separately)
- ✅ Intelligent cache key normalization (A,B,C = C,B,A)
- ✅ 8-hour cache TTL
- ✅ Partial cache hits (if A,B cached, only fetch C from backend)
- ✅ Easy monitoring and debugging
- ✅ Foundation for future cache invalidation

## Next Steps

1. Implement the code as outlined above
2. Test with your actual backend endpoints
3. Adjust field names (`commaSeparatedField`, `otherField`) to match your API
4. Fine-tune CORS settings based on backend requirements
5. Add monitoring/alerting as needed
6. Consider adding cache invalidation endpoints when requirements are clear
