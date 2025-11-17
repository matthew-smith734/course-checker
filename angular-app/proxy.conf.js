const PROXY_CONFIG = {
  "/api": {
    "target": "https://api.easi.utoronto.ca",
    "secure": true,
    "changeOrigin": true,
    "logLevel": "debug",
    "pathRewrite": {
      "^/api": "/ttb"
    },
    "onProxyRes": function (proxyRes, req, res) {
      console.log('[Proxy] Response from:', req.url);
      console.log('[Proxy] Status:', proxyRes.statusCode);
      console.log('[Proxy] Headers:', JSON.stringify(proxyRes.headers));
      
      // Log response body for debugging
      let body = [];
      proxyRes.on('data', function(chunk) {
        body.push(chunk);
      });
      proxyRes.on('end', function() {
        body = Buffer.concat(body).toString();
        console.log('[Proxy] Body length:', body.length);
        if (body.length < 1000) {
          console.log('[Proxy] Body:', body);
        } else {
          console.log('[Proxy] Body (first 500):', body.substring(0, 500));
        }
      });
    },
    "onProxyReq": function(proxyReq, req, res) {
      console.log('[Proxy] Request to:', req.url);
      console.log('[Proxy] Method:', req.method);
    }
  }
};

module.exports = PROXY_CONFIG;
