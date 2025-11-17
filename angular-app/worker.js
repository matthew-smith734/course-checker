// Cloudflare Worker to proxy UofT API requests
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Extract the path from the request
    const url = new URL(request.url);
    
    // Check if this is a request to proxy
    if (url.pathname.startsWith('/api/')) {
      // Remove /api prefix and construct target URL
      const targetPath = url.pathname.replace('/api', '/ttb');
      const targetUrl = `https://api.easi.utoronto.ca${targetPath}${url.search}`;
      
      console.log('Proxying request to:', targetUrl);

      // Forward the request to the UofT API
      const apiRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' ? await request.text() : null,
      });

      // Fetch from the UofT API
      const apiResponse = await fetch(apiRequest);
      
      // Get the response body
      const responseBody = await apiResponse.text();
      
      console.log('Response status:', apiResponse.status);
      console.log('Response length:', responseBody.length);

      // Return the response with CORS headers
      return new Response(responseBody, {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        headers: {
          'Content-Type': apiResponse.headers.get('Content-Type') || 'application/xml',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
        },
      });
    }

    // For non-API requests, return 404
    return new Response('Not Found', { status: 404 });
  },
};
