# Warpio Net - Clean Docker Image
# Multi-stage build for production deployment

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
COPY packages/terminal-frontend/package*.json ./packages/terminal-frontend/
RUN npm ci
COPY packages/terminal-frontend ./packages/terminal-frontend
WORKDIR /app/packages/terminal-frontend
RUN npm run build

# Stage 2: Build Backend Dependencies
FROM node:20-alpine AS backend-builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
COPY packages/web-terminal/package*.json ./packages/web-terminal/
RUN npm ci
COPY packages/web-terminal ./packages/web-terminal

# Stage 3: Production Image
FROM node:20-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    bash \
    curl \
    git \
    python3 \
    make \
    g++ \
    jq

# Install Warpio CLI (simple approach)
RUN git clone https://github.com/JaimeCernuda/warpio-cli.git /tmp/warpio-cli && \
    cd /tmp/warpio-cli && \
    npm install && \
    npm run build && \
    npm link && \
    echo "Verifying warpio installation..." && \
    which warpio && \
    ls -la $(which warpio) && \
    cd / && \
    rm -rf /tmp/warpio-cli

# Create application user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S warpio -u 1001

# Set up application directory
WORKDIR /app
RUN mkdir -p /app/data /app/data/admin && \
    chown -R warpio:nodejs /app

# Copy application files
COPY package*.json ./
COPY packages/web-terminal/package*.json ./packages/web-terminal/
RUN npm ci && npm cache clean --force

# Copy built frontend and backend source
COPY --from=frontend-builder /app/packages/terminal-frontend/dist ./packages/terminal-frontend/dist
COPY --from=backend-builder /app/packages/web-terminal/src ./packages/web-terminal/src
COPY --from=backend-builder /app/packages/web-terminal/node_modules ./packages/web-terminal/node_modules

# Copy scripts and create web-server stub
COPY scripts ./scripts
RUN mkdir -p packages/web-server/src/auth && \
    echo 'import fs from "fs"; import path from "path"; import crypto from "crypto"; const USERS_FILE = "/app/data/users.json"; const TOKENS_FILE = "/app/data/tokens.json"; export class UserManager { constructor() { this.ensureUsersFile(); this.ensureTokensFile(); } ensureUsersFile() { try { if (!fs.existsSync(USERS_FILE)) { fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true }); fs.writeFileSync(USERS_FILE, "[]"); } } catch(e) {} } ensureTokensFile() { try { if (!fs.existsSync(TOKENS_FILE)) { fs.writeFileSync(TOKENS_FILE, "{}"); } } catch(e) {} } getUsers() { try { return JSON.parse(fs.readFileSync(USERS_FILE, "utf8")); } catch(e) { return []; } } saveUsers(users) { try { fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2)); } catch(e) {} } getTokens() { try { return JSON.parse(fs.readFileSync(TOKENS_FILE, "utf8")); } catch(e) { return {}; } } saveTokens(tokens) { try { fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2)); } catch(e) {} } hasUsers() { return this.getUsers().length > 0; } async authenticateUser(username, password) { const users = this.getUsers(); return users.find(u => u.username === username && u.password === password) || null; } async createUser(userData) { const users = this.getUsers(); if (users.find(u => u.username === userData.username)) return false; users.push({ ...userData, createdAt: new Date().toISOString() }); this.saveUsers(users); return true; } generateToken(user) { const token = crypto.randomBytes(32).toString("hex"); const tokens = this.getTokens(); tokens[token] = { username: user.username, workingDirectory: user.workingDirectory, createdAt: new Date().toISOString() }; this.saveTokens(tokens); return token; } verifyToken(token) { const tokens = this.getTokens(); return tokens[token] || null; } }' > packages/web-server/src/auth/userManager.js && \
    echo 'export class AuthMiddleware { constructor(userManager) { this.userManager = userManager; } requireAuth = (req, res, next) => { const token = req.headers.authorization?.replace("Bearer ", "") || req.session?.token; if (token) { const user = this.userManager.verifyToken(token); if (user) { req.user = user; req.session.user = user; next(); return; } } if (req.session?.user) { req.user = req.session.user; next(); return; } res.status(401).json({ error: "Unauthorized" }); }; }' > packages/web-server/src/auth/middleware.js

# Security headers already fixed in source code

# Create initial admin user  
RUN echo '[{"username":"admin","password":"warpio123","workingDirectory":"/app/data/admin","createdAt":"2024-01-01T00:00:00.000Z"}]' > /app/data/users.json

# Fix permissions
RUN chown -R warpio:nodejs /app && \
    chmod -R 755 /app

# Switch to application user
USER warpio

# Environment variables
ENV NODE_ENV=production
ENV PORT=5015
ENV WARPIO_DATA_DIR=/app/data

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5015/api/health || exit 1

# Expose port
EXPOSE 5015

# Start application
WORKDIR /app/packages/web-terminal
CMD ["npm", "run", "dev"]