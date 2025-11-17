# UofT Course Checker - Angular

A modern web application for checking University of Toronto course availability and enrollment information, built with Angular and designed to run on Cloudflare Pages.

## Features

- Search for UofT courses by semester and course code
- View real-time enrollment information
- Check multiple courses at once
- Clean, responsive UI that works on desktop and mobile
- Fast static hosting on Cloudflare Pages

## Project Structure

```
angular-app/
├── src/
│   ├── app/
│   │   ├── models/
│   │   │   └── course.model.ts       # TypeScript interfaces
│   │   ├── services/
│   │   │   └── course.service.ts     # API service
│   │   ├── app.component.ts          # Main component
│   │   ├── app.component.html        # Template
│   │   └── app.component.css         # Styles
│   ├── index.html                     # Main HTML
│   ├── main.ts                        # Bootstrap file
│   ├── styles.css                     # Global styles
│   └── _redirects                     # Cloudflare Pages routing
├── angular.json                       # Angular CLI config
├── package.json                       # Dependencies
└── tsconfig.json                      # TypeScript config
```

## Local Development

### Prerequisites

- Node.js (v18 or later)
- npm (comes with Node.js)

### Setup

1. Navigate to the angular-app directory:
   ```bash
   cd angular-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the proxy server (in one terminal):
   ```bash
   npm run start:proxy
   ```
   This proxy server handles API requests and bypasses CORS restrictions in development.

4. Start the development server (in another terminal):
   ```bash
   npm start
   ```

5. Open your browser to `http://localhost:4200`

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist/course-checker-angular` directory.

## Deploying to Cloudflare Pages

### Option 1: Cloudflare Dashboard (Recommended)

1. **Create a Cloudflare Pages Project:**
   - Log in to your Cloudflare dashboard
   - Go to Pages and click "Create a project"
   - Connect your GitHub repository

2. **Configure Build Settings:**
   - **Framework preset:** Angular
   - **Build command:** `npm run build`
   - **Build output directory:** `dist/course-checker-angular`
   - **Root directory:** `angular-app`

3. **Environment Variables** (if needed):
   - Node version: `18` or higher

4. Click "Save and Deploy"

### Option 2: Wrangler CLI

1. Install Wrangler:
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Deploy:
   ```bash
   wrangler pages deploy dist/course-checker-angular
   ```

## Usage

1. **Enter Semester:** Use the format YYYYM where:
   - `20251` = 2025 Winter
   - `20255` = 2025 Summer
   - `20259` = 2025 Fall

2. **Enter Courses:** Provide comma-separated course codes:
   - Example: `CSC108H1,MAT137Y1,PHY151H1`

3. Click **Submit** to search for courses

4. View results showing:
   - Course availability
   - Section names
   - Current enrollment vs. maximum enrollment
   - Visual enrollment bars

## Architecture

### Local Development
- **Angular Dev Server** (`localhost:4200`) - Serves the Angular application
- **Node.js Proxy Server** (`localhost:3000`) - Proxies API requests to bypass CORS
- **UofT API** (`api.easi.utoronto.ca`) - Course data API

### Production (Cloudflare Pages)
- **Angular App** (deployed static files) - Makes direct API calls
- **UofT API** - Course data API (CORS should work from production domain)

If CORS is an issue in production, a Cloudflare Worker can be added as a proxy.

## Technologies Used

- **Angular 17** - Modern web framework with standalone components
- **TypeScript** - Type-safe JavaScript
- **RxJS** - Reactive programming for API calls
- **Cloudflare Pages** - Static site hosting with global CDN

## Converting from Java

This Angular application replaces the original Java Swing GUI application with:
- Modern web interface instead of Swing components
- Browser-based instead of desktop application
- Responsive design that works on any device
- Static hosting on Cloudflare Pages instead of JAR file
- Same functionality: course search and enrollment checking

## Troubleshooting

### Build Errors

If you encounter build errors, try:
```bash
rm -rf node_modules package-lock.json
npm install
```

### CORS Issues

**Local Development:** Uses a Node.js proxy server (`proxy-server.js`) on port 3000 to handle CORS.

**Production:** The app makes direct API calls. If CORS issues occur on Cloudflare Pages, a Cloudflare Worker can be added as a proxy.

### Deployment Issues

- Ensure the build output directory is correct: `dist/course-checker-angular`
- Check that Node.js version is 18 or higher
- Verify the `_redirects` file is included in the build output

## License

This project is provided as-is for educational purposes.

## Contributing

Feel free to submit issues or pull requests for improvements!
