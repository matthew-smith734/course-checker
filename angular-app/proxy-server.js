const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist', 'course-checker-angular');
const TARGET_BASE = 'https://api.easi.utoronto.ca/ttb';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Accept',
};

app.disable('x-powered-by');

app.use(express.text({ type: '*/*', limit: '1mb' }));

app.options('/api/*', (req, res) => {
  res.set(CORS_HEADERS);
  res.sendStatus(204);
});

async function proxyHandler(req, res) {
  const targetPath = req.originalUrl.replace(/^\/api/, '');
  const targetUrl = `${TARGET_BASE}${targetPath}`;
  console.log(`[Proxy] ${req.method} -> ${targetUrl}`);

  const headers = {
    Accept: '*/*',
    'User-Agent': 'Mozilla/5.0',
  };

  const contentType = req.headers['content-type'];
  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  const fetchOptions = {
    method: req.method,
    headers,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
    fetchOptions.body = req.body;
  }

  try {
    const upstream = await fetch(targetUrl, fetchOptions);
    const body = await upstream.text();
    console.log('[Proxy] Response', upstream.status, 'length', body.length);

    res.set(CORS_HEADERS);
    res.set('Content-Type', upstream.headers.get('content-type') || 'text/xml; charset=UTF-8');
    res.status(upstream.status).send(body);
  } catch (error) {
    console.error('[Proxy] Fetch error', error);
    res.set(CORS_HEADERS);
    res.status(502).send('Bad Gateway');
  }
}

app.all('/api/*', proxyHandler);

app.use(express.static(DIST_DIR));

// Always serve index.html so the SPA can handle routing
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n✓ Production server listening on http://localhost:${PORT}`);
  console.log('✓ Serving built Angular app and proxying /api requests.\n');
});
