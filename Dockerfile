# Warpio Net - Docker Image
# Multi-stage build for production-ready container

# Build stage - Frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY packages/terminal-frontend/package.json ./packages/terminal-frontend/

# Install dependencies
RUN npm ci --only=production

# Copy frontend source
COPY packages/terminal-frontend ./packages/terminal-frontend

# Build frontend
WORKDIR /app/packages/terminal-frontend
RUN npm run build

# Build stage - Backend
FROM node:18-alpine AS backend-builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY packages/web-terminal/package.json ./packages/web-terminal/

# Install dependencies
RUN npm ci --only=production

# Copy backend source
COPY packages/web-terminal ./packages/web-terminal

# Build backend
WORKDIR /app/packages/web-terminal
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install system dependencies and warpio-cli
RUN apk add --no-cache \
    bash \
    curl \
    git \
    python3 \
    make \
    g++ \
    && npm install -g warpio-cli \
    && apk del make g++ python3

# Create app user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S warpio -u 1001

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY package.json package-lock.json ./
COPY packages/web-terminal/package.json ./packages/web-terminal/
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=backend-builder /app/packages/web-terminal/dist ./packages/web-terminal/dist
COPY --from=backend-builder /app/packages/web-terminal/node_modules ./packages/web-terminal/node_modules
COPY --from=frontend-builder /app/packages/terminal-frontend/dist ./packages/terminal-frontend/dist

# Copy scripts and other required files
COPY scripts ./scripts

# Create data directory for user storage
RUN mkdir -p /app/data/.warpio/web-server \
    && chown -R warpio:nodejs /app \
    && chmod -R 755 /app

# Switch to non-root user
USER warpio

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3003/api/auth/setup-status || exit 1

# Environment variables
ENV NODE_ENV=production
ENV PORT=3003
ENV WARPIO_DATA_DIR=/app/data

# Start the application
WORKDIR /app/packages/web-terminal
CMD ["npm", "start"]