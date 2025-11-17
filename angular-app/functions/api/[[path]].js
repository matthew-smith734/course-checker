export async function onRequest(context) {
	const { request } = context;
	const url = new URL(request.url);
	
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

	// Proxy to UofT API - extract the path after /api/
	const pathMatch = url.pathname.match(/\/api\/(.+)/);
	const targetPath = pathMatch ? `/ttb/${pathMatch[1]}` : '/ttb';
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
}
