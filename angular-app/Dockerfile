FROM node:20-alpine AS builder
WORKDIR /app

# install dependencies before compiling
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

# install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# copy build artifacts and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/proxy-server.js ./proxy-server.js

EXPOSE 3000
CMD ["node", "proxy-server.js"]