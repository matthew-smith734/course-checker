export default {
	async fetch(request) {
		const url = new URL(request.url);
		
		// Only handle /api/* requests
		if (!url.pathname.startsWith('/api/')) {
			return new Response('Not found', { status: 404 });
		}

		// Handle CORS preflight
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

		// Proxy to UofT API
		const targetPath = url.pathname.replace('/api', '/ttb');
		const targetUrl = `https://api.easi.utoronto.ca${targetPath}${url.search}`;

		const proxyRequest = new Request(targetUrl, {
			method: request.method,
			headers: request.headers,
			body: request.body,
		});

		const response = await fetch(proxyRequest);
		const newResponse = new Response(response.body, response);
		
		// Add CORS headers
		newResponse.headers.set('Access-Control-Allow-Origin', '*');
		newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
		newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
		
		return newResponse;
	},
};
