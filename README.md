# Course Checker

An Angular application for checking University of Toronto course availability and enrollment information.

This project was converted from a Java Swing application to a modern Angular web application. It maintains the same functionality and API calls as the original Java version.

## Features

- Search for UofT courses by semester and course code
- Display section information including:
  - Section name
  - Current enrollment
  - Maximum enrollment
- Clean, responsive UI matching the original Java GUI layout

## Prerequisites

- Node.js (v20 or higher)
- npm (v10 or higher)

## Installation

```bash
npm install
```

## Development Server

To start the development server with proxy configuration (to handle CORS):

```bash
npm start
```

Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Build

To build the project for production:

```bash
npm run build
```

The build artifacts will be stored in the `dist/course-checker-app/` directory.

## Usage

1. Enter the semester code (e.g., `20259` for Winter 2025)
2. Enter one or more course codes separated by commas (e.g., `GGR348H1`)
3. Click "Submit" to search for courses
4. View the results showing section availability

## Testing

Run the application with the following test data:
- **Semester:** `20259`
- **Course:** `GGR348H1`

## API Endpoints

The application uses the University of Toronto's EASI API:
- `GET /ttb/getOptimizedMatchingCourseTitles` - Search for course titles
- `POST /ttb/getPageableCourses` - Get detailed course section information

## Technical Details

- **Framework:** Angular 18
- **Language:** TypeScript
- **XML Parser:** fast-xml-parser
- **HTTP Client:** Angular HttpClient with RxJS

## Project Structure

```
src/
├── app/
│   ├── app.component.ts          # Main component with form and results
│   ├── app.component.html        # Template matching Java GUI layout
│   ├── app.component.css         # Styles matching Java GUI appearance
│   ├── course.service.ts         # HTTP service for API calls
│   └── xml-parser.service.ts     # XML parsing service
├── index.html
└── main.ts
```

## Notes

- The application requires network access to the UofT EASI API
- A proxy configuration is included for local development to handle CORS
- The logic and API calls are identical to the original Java implementation
