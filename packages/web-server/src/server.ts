/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { UserManager } from './auth/userManager.js';
import { AuthMiddleware } from './auth/middleware.js';
import { SimpleChatManager } from './chat/simpleChatManager.js';
import { createAuthRoutes } from './routes/auth.js';
import { createFileRoutes } from './routes/files.js';
import { createChatRoutes } from './routes/chat.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WarpioWebServer {
  private app: express.Application;
  private userManager: UserManager;
  private authMiddleware: AuthMiddleware;
  private chatManager: SimpleChatManager;

  constructor() {
    this.app = express();
    this.userManager = new UserManager();
    this.authMiddleware = new AuthMiddleware(this.userManager);
    this.chatManager = new SimpleChatManager();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupStaticFiles();
  }

  private setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-domain.com'] 
        : ['http://localhost:3000', 'http://localhost:3003', 'http://localhost:5173'],
      credentials: true
    }));

    // Rate limiting - more permissive for development
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 100 : 1000, // higher limit in dev
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use('/api', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Session management
    this.app.use(session({
      secret: process.env.WARPIO_SESSION_SECRET || 'warpio-session-secret-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    }));
  }

  private setupRoutes() {
    // API routes
    this.app.use('/api/auth', createAuthRoutes(this.userManager, this.authMiddleware));
    this.app.use('/api/files', createFileRoutes(this.authMiddleware));
    this.app.use('/api/chat', createChatRoutes(this.authMiddleware, this.chatManager));

    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '0.1.0'
      });
    });

    // API 404 handler
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({ error: 'API endpoint not found' });
    });
  }

  private setupStaticFiles() {
    // Serve static files from frontend build (will be created later)
    const frontendPath = path.join(__dirname, '../../frontend/dist');
    this.app.use(express.static(frontendPath));

    // Serve index.html for all non-API routes (SPA support)
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
        if (err) {
          res.status(404).send(`
            <html>
              <head><title>Warpio Web Interface</title></head>
              <body>
                <h1>Warpio Web Interface</h1>
                <p>Frontend not built yet. Please run the frontend build process.</p>
                <p>API is available at <a href="/api/health">/api/health</a></p>
                <p>Default credentials: <strong>warpio / warpio123</strong></p>
              </body>
            </html>
          `);
        }
      });
    });
  }

  start(port: number = 3001) {
    return new Promise<void>((resolve) => {
      this.app.listen(port, () => {
        console.log(`🚀 Warpio Web Server running on http://localhost:${port}`);
        console.log(`📝 Default credentials: warpio / warpio123`);
        console.log(`🔍 API Health: http://localhost:${port}/api/health`);
        resolve();
      });
    });
  }

  getApp() {
    return this.app;
  }
}