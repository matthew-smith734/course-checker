### Build stage: compiles Angular, then drop artifacts into nginx runtime.
FROM node:20-alpine AS builder
WORKDIR /app
ARG COURSE_CHECKER_VERSION
ENV COURSE_CHECKER_VERSION=${COURSE_CHECKER_VERSION:-}

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
### Builder stage: compile the Angular application so the runtime image stays slim.

FROM nginx:alpine AS runtime
### Runtime stage: serve the compiled SPA with nginx and let it proxy /api.
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist/course-checker-angular .
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 4200
CMD ["nginx", "-g", "daemon off;"]
