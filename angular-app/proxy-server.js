const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

// Enable CORS for localhost:4200
app.use(cors({
  origin: 'http://localhost:4200'
}));

// Parse JSON bodies
app.use(express.json());

// Proxy GET requests
app.get('/ttb/*', async (req, res) => {
  const targetUrl = `https://api.easi.utoronto.ca${req.url}`;
  console.log('[Proxy Server] GET:', targetUrl);
  
  try {
    const response = await fetch(targetUrl);
    const text = await response.text();
    console.log('[Proxy Server] Response length:', text.length);
    
    res.set('Content-Type', response.headers.get('content-type'));
    res.send(text);
  } catch (error) {
    console.error('[Proxy Server] Error:', error);
    res.status(500).send('Proxy error');
  }
});

// Proxy POST requests
app.post('/ttb/*', async (req, res) => {
  const targetUrl = `https://api.easi.utoronto.ca${req.url}`;
  console.log('[Proxy Server] POST:', targetUrl);
  console.log('[Proxy Server] Body:', JSON.stringify(req.body).substring(0, 200));
  
  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      body: JSON.stringify(req.body)
    });
    
    const text = await response.text();
    console.log('[Proxy Server] Response status:', response.status);
    console.log('[Proxy Server] Response length:', text.length);
    console.log('[Proxy Server] Response (first 500):', text.substring(0, 500));
    
    res.set('Content-Type', response.headers.get('content-type'));
    res.send(text);
  } catch (error) {
    console.error('[Proxy Server] Error:', error);
    res.status(500).send('Proxy error');
  }
});

app.listen(PORT, () => {
  console.log(`\n✓ Proxy server running on http://localhost:${PORT}`);
  console.log('✓ Ready to proxy requests to https://api.easi.utoronto.ca\n');
});
