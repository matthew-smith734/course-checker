export async function onRequest(context) {
	const { request } = context;
	const url = new URL(request.url);
	
	console.log('=== Function called ===');
	console.log('Method:', request.method);
	console.log('URL:', url.href);
	console.log('Path:', url.pathname);
	
	// Handle CORS preflight
	if (request.method === 'OPTIONS') {
		console.log('Handling OPTIONS preflight');
		return new Response(null, {
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Accept',
				'Access-Control-Max-Age': '86400',
			},
		});
	}

	try {
		// Proxy to UofT API - extract the path after /api/
		const pathMatch = url.pathname.match(/\/api\/(.+)/);
		const targetPath = pathMatch ? `/ttb/${pathMatch[1]}` : '/ttb';
		const targetUrl = `https://api.easi.utoronto.ca${targetPath}${url.search}`;

		// Build the fetch options
		const fetchOptions = {
			method: request.method,
			headers: {
				'Accept': '*/*',
				'User-Agent': 'Mozilla/5.0',
			},
		};

		// Add body for POST/PUT requests
		if (request.method === 'POST' || request.method === 'PUT') {
			const contentType = request.headers.get('Content-Type') || '';
			const body = await request.text();
			fetchOptions.body = body;
			fetchOptions.headers['Content-Type'] = contentType || 'application/json';
			console.log('=== POST Request ===');
			console.log('Content-Type:', contentType);
			console.log('POST body:', body);
			console.log('POST body length:', body.length);
		}

		console.log('Fetching:', targetUrl);

		const response = await fetch(targetUrl, fetchOptions);
		const responseText = await response.text();
		
		console.log('Response status:', response.status);
		console.log('Response body length:', responseText.length);
		console.log('Response preview:', responseText.substring(0, 200));

		// Return response with CORS headers
		return new Response(responseText, {
			status: response.status,
			statusText: response.statusText,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Accept',
				'Content-Type': response.headers.get('Content-Type') || 'text/xml; charset=UTF-8',
			},
		});
	} catch (error) {
		console.error('Proxy error:', error.message, error.stack);
		return new Response(JSON.stringify({ 
			error: error.message,
			stack: error.stack 
		}), {
			status: 500,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Content-Type': 'application/json',
			},
		});
	}
}
