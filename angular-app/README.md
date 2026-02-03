# UofT Course Checker - Angular

A modern web application for checking University of Toronto course availability and enrollment information. The SPA is built with Angular 17 and is served by a lightweight Node/Express proxy so that Docker deployments (and local development) can call the UofT API without CORS issues.

## Project Structure

```
angular-app/
├── src/                        # Angular source files (components, models, styles, etc.)
├── proxy-server.js             # Express server that serves the build and proxies /api
├── Dockerfile                  # Multi-stage build + runtime for the production container
├── package.json                # npm scripts + dependencies
├── tsconfig*.json              # TypeScript compiler settings
└── README.md                   # This overview
```

## Local Development

### Prerequisites

- Node.js (v18 or later)
- npm (bundled with Node)

### Setup

1. Open a terminal and change into the `angular-app` directory:
   ```bash
   cd angular-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the proxy server (handles `/api` calls and bypasses CORS):
   ```bash
   npm run start:proxy
   ```
4. In a second terminal, run the Angular dev server:
   ```bash
   npm start
   ```
5. Visit `http://localhost:4200` to explore the UI. The dev server proxies API requests through the local proxy.

## Building for Production

```bash
npm run build
```

The optimized files live in `dist/course-checker-angular`. The production-ready server (`proxy-server.js`) serves those files and proxies `/api` requests to `https://api.easi.utoronto.ca/ttb`, supplying the same CORS headers the Cloudflare Worker used previously.

### Running the Production Build Locally

After building the SPA, you can start the production server without Docker:

```bash
PORT=3000 node proxy-server.js
```

Then open `http://localhost:3000`. The server responds with the compiled Angular bundle and handles `/api/*` requests on your behalf.

## Docker Deployment

The `Dockerfile` defines a multi-stage build that compiles the Angular app and then runs `proxy-server.js` inside a minimal `node:20-alpine` image.

1. Build the image:
   ```bash
   docker build -t course-checker-angular .
   ```
2. Run the container (map port 3000 to your desired host port):
   ```bash
   docker run -p 80:3000 course-checker-angular
   ```
3. Browse to `http://localhost` and use the app. The container serves the SPA and proxies `/api/*` to the UofT API with the proper headers.

## Usage

1. **Enter Semester:** Use the format `YYYYM` where:
   - `20251` = 2025 Winter
   - `20255` = 2025 Summer
   - `20259` = 2025 Fall

2. **Enter Courses:** Provide comma-separated course codes (e.g., `CSC108H1,MAT137Y1,PHY151H1`). The input is sanitized to remove whitespace and invisible characters.

3. Click **Submit** to search for courses.

4. Results show:
   - Course availability
   - Section names
   - Current enrollment vs. maximum enrollment
   - Visual enrollment bars for quick scanning

## Architecture

### Local Development

- **Angular dev server** (`localhost:4200`) – serves the SPA and proxies `/api` requests to the local proxy via `proxy.conf.js`.
- **Proxy server** (`localhost:3000`) – Express app that handles `/api` calls, mirrors the Cloudflare Worker behavior, and applies the necessary CORS headers.

### Production

- **Docker container** – runs `proxy-server.js` inside `node:20-alpine`. The same proxy logic serves the compiled SPA (`dist/course-checker-angular`) and forwards `/api/*` to `https://api.easi.utoronto.ca/ttb`, ensuring CORS is satisfied for the browser.

## Troubleshooting

### Build Errors

If you encounter build errors, try:

```bash
rm -rf node_modules package-lock.json
npm install
```

### CORS Issues

The Node proxy (used in `npm run start:proxy` and in the Docker runtime) adds `Access-Control-Allow-Origin: *` for `/api`, so the browser should never see CORS errors. If you still encounter them, ensure the proxy server is running and that the SPA calls `/api/*` (not the upstream URL directly).

### Deployment Issues

- Confirm the build output directory is `dist/course-checker-angular`.
- Make sure Docker exposes port 3000 (or maps it to your desired host port).
- Verify the container can reach `api.easi.utoronto.ca` (requires outbound internet).

## License

This project is provided as-is for educational purposes.

## Contributing

Feel free to submit issues or pull requests for improvements!
