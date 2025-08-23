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
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { spawn } from 'node-pty';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import multer from 'multer';
import { UserManager } from '../../web-server/src/auth/userManager.js';
import { AuthMiddleware, AuthenticatedRequest } from '../../web-server/src/auth/middleware.js';
import { Request, Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WarpioTerminalServer {
  private app: express.Application;
  private server: any;
  private io: SocketServer;
  private userManager: UserManager;
  private authMiddleware: AuthMiddleware;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.userManager = new UserManager();
    this.authMiddleware = new AuthMiddleware(this.userManager);
    
    // Initialize Socket.IO
    this.io = new SocketServer(this.server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://your-domain.com'] 
          : ['http://localhost:3000', 'http://localhost:3003', 'http://localhost:5173'],
        credentials: true
      }
    });
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupTerminalHandlers();
    this.setupStaticFiles();
  }

  private setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-eval'"], // xterm.js needs unsafe-eval
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'", "ws:", "wss:"],
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

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 100 : 1000,
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
    // Upload middleware
    const upload = multer({ 
      dest: '/tmp/warpio-uploads/',
      limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
    });

    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '0.1.0',
        type: 'terminal-integrated'
      });
    });

    // Auth routes
    this.setupAuthRoutes();
    
    // File routes
    this.setupFileRoutes(upload);
  }

  private setupAuthRoutes() {
    // Login endpoint
    this.app.post('/api/auth/login', async (req: Request, res: Response) => {
      try {
        const { username, password } = req.body;

        if (!username || !password) {
          return res.status(400).json({ error: 'Username and password required' });
        }

        const session = await this.userManager.authenticateUser(username, password);
        if (!session) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = this.userManager.generateToken(session);
        
        // Set token in session and cookie
        req.session!.token = token;
        res.cookie('auth_token', token, { 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({
          success: true,
          token,
          user: {
            username: session.username,
            workingDirectory: session.workingDirectory
          }
        });
      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Auth validation endpoint
    this.app.post('/api/auth/validate', (req, res) => {
      const token = req.headers.authorization?.replace('Bearer ', '') || 
                    req.session?.token ||
                    req.cookies?.auth_token;

      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = this.userManager.verifyToken(token);
      if (!user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      res.json({ valid: true, user });
    });

    // Logout endpoint
    this.app.post('/api/auth/logout', (req: Request, res: Response) => {
      req.session?.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
        }
      });
      res.clearCookie('auth_token');
      res.json({ success: true });
    });

    // Get current user info
    this.app.get('/api/auth/me', this.authMiddleware.requireAuth, (req: AuthenticatedRequest, res: Response) => {
      res.json({
        user: {
          username: req.user!.username,
          workingDirectory: req.user!.workingDirectory
        }
      });
    });

    // Create new user (admin only for now)
    this.app.post('/api/auth/users', this.authMiddleware.requireAuth, async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { username, password, workingDirectory, geminiApiKey } = req.body;

        if (!username || !password) {
          return res.status(400).json({ error: 'Username and password required' });
        }

        const user = await this.userManager.createUser(username, password, workingDirectory, geminiApiKey);
        const { passwordHash, ...safeUser } = user;
        
        res.status(201).json({ user: safeUser });
      } catch (error) {
        if (error instanceof Error && error.message === 'Username already exists') {
          return res.status(409).json({ error: error.message });
        }
        console.error('User creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // List users (admin only for now)
    this.app.get('/api/auth/users', this.authMiddleware.requireAuth, async (req: AuthenticatedRequest, res: Response) => {
      try {
        const users = await this.userManager.listUsers();
        res.json({ users });
      } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Check if system has users (no auth required for setup)
    this.app.get('/api/auth/setup-status', async (req: Request, res: Response) => {
      try {
        const hasUsers = await this.userManager.hasUsers();
        res.json({ hasUsers, needsSetup: !hasUsers });
      } catch (error) {
        console.error('Setup status error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Create first user (no auth required, only works if no users exist)
    this.app.post('/api/auth/setup', async (req: Request, res: Response) => {
      try {
        const { username, password, workingDirectory, geminiApiKey } = req.body;

        if (!username || !password) {
          return res.status(400).json({ error: 'Username and password required' });
        }

        const user = await this.userManager.createFirstUser(username, password, workingDirectory, geminiApiKey);
        const { passwordHash, ...safeUser } = user;
        
        res.status(201).json({ 
          success: true,
          message: 'First user created successfully',
          user: safeUser 
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('users already exist')) {
          return res.status(409).json({ error: 'Setup already completed' });
        }
        console.error('Setup error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  private setupFileRoutes(upload: any) {
    // Helper function to resolve and validate paths
    const resolvePath = (userWorkingDir: string, requestedPath: string) => {
      const resolved = path.resolve(userWorkingDir, requestedPath || '.');
      
      // Security check: ensure path is within user's working directory
      if (!resolved.startsWith(userWorkingDir)) {
        throw new Error('Access denied: Path outside working directory');
      }
      
      return resolved;
    };

    // List directory contents
    this.app.get('/api/files/ls', this.authMiddleware.requireAuth, async (req: AuthenticatedRequest, res: Response) => {
      try {
        const requestedPath = req.query.path as string || '.';
        const fullPath = resolvePath(req.user!.workingDirectory, requestedPath);
        
        const stats = await fs.stat(fullPath);
        if (!stats.isDirectory()) {
          return res.status(400).json({ error: 'Path is not a directory' });
        }

        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        const items = await Promise.all(
          entries.map(async (entry) => {
            const itemPath = path.join(fullPath, entry.name);
            const itemStats = await fs.stat(itemPath);
            return {
              name: entry.name,
              type: entry.isDirectory() ? 'directory' : 'file',
              size: entry.isFile() ? itemStats.size : undefined,
              modified: itemStats.mtime.toISOString(),
              relativePath: path.relative(req.user!.workingDirectory, itemPath)
            };
          })
        );

        res.json({
          path: path.relative(req.user!.workingDirectory, fullPath) || '.',
          items: items.sort((a, b) => {
            // Directories first, then files, both alphabetically
            if (a.type !== b.type) {
              return a.type === 'directory' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          })
        });
      } catch (error) {
        console.error('Directory listing error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to list directory' });
      }
    });

    // Read file contents
    this.app.get('/api/files/read', this.authMiddleware.requireAuth, async (req: AuthenticatedRequest, res: Response) => {
      try {
        const requestedPath = req.query.path as string;
        if (!requestedPath) {
          return res.status(400).json({ error: 'Path parameter required' });
        }

        const fullPath = resolvePath(req.user!.workingDirectory, requestedPath);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          return res.status(400).json({ error: 'Path is a directory, not a file' });
        }

        // For binary files, return metadata only
        const isBinary = await this.isLikelyBinary(fullPath);
        if (isBinary) {
          return res.json({
            path: requestedPath,
            type: 'binary',
            size: stats.size,
            modified: stats.mtime.toISOString()
          });
        }

        const content = await fs.readFile(fullPath, 'utf8');
        res.json({
          path: requestedPath,
          type: 'text',
          content,
          size: stats.size,
          modified: stats.mtime.toISOString()
        });
      } catch (error) {
        console.error('File read error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to read file' });
      }
    });

    // Write file contents
    this.app.post('/api/files/write', this.authMiddleware.requireAuth, async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { path: requestedPath, content } = req.body;
        if (!requestedPath || content === undefined) {
          return res.status(400).json({ error: 'Path and content required' });
        }

        const fullPath = resolvePath(req.user!.workingDirectory, requestedPath);
        
        // Ensure parent directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        
        await fs.writeFile(fullPath, content, 'utf8');
        const stats = await fs.stat(fullPath);
        
        res.json({
          success: true,
          path: requestedPath,
          size: stats.size,
          modified: stats.mtime.toISOString()
        });
      } catch (error) {
        console.error('File write error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to write file' });
      }
    });

    // Upload file
    this.app.post('/api/files/upload', this.authMiddleware.requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        const targetPath = req.body.path || req.file.originalname;
        const fullPath = resolvePath(req.user!.workingDirectory, targetPath);
        
        // Ensure parent directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        
        // Move uploaded file to target location
        await fs.rename(req.file.path, fullPath);
        const stats = await fs.stat(fullPath);
        
        res.json({
          success: true,
          path: targetPath,
          size: stats.size,
          modified: stats.mtime.toISOString()
        });
      } catch (error) {
        console.error('File upload error:', error);
        // Clean up temp file if it exists
        if (req.file?.path) {
          fs.unlink(req.file.path).catch(() => {});
        }
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to upload file' });
      }
    });

    // Delete file or directory
    this.app.delete('/api/files/delete', this.authMiddleware.requireAuth, async (req: AuthenticatedRequest, res: Response) => {
      try {
        const requestedPath = req.query.path as string;
        if (!requestedPath) {
          return res.status(400).json({ error: 'Path parameter required' });
        }

        const fullPath = resolvePath(req.user!.workingDirectory, requestedPath);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          await fs.rmdir(fullPath, { recursive: true });
        } else {
          await fs.unlink(fullPath);
        }
        
        res.json({ success: true, path: requestedPath });
      } catch (error) {
        console.error('File delete error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete file' });
      }
    });
  }

  // Helper function to detect binary files
  private async isLikelyBinary(filePath: string): Promise<boolean> {
    try {
      const buffer = await fs.readFile(filePath);
      const sample = buffer.subarray(0, Math.min(1024, buffer.length));
      
      // Check for null bytes (common in binary files)
      for (let i = 0; i < sample.length; i++) {
        if (sample[i] === 0) {
          return true;
        }
      }
      
      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      const binaryExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.zip', '.tar', '.gz', '.exe', '.bin', '.so', '.dll'];
      return binaryExtensions.includes(ext);
    } catch {
      return false;
    }
  }

  private setupTerminalHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Terminal client connected:', socket.id);

      let ptyProcess: any = null;

      socket.on('auth', async (data) => {
        try {
          const { token } = data;
          const user = this.userManager.verifyToken(token);
          
          if (!user) {
            socket.emit('auth-failed', { error: 'Invalid token' });
            return;
          }

          socket.emit('auth-success', { user });
          
          // Start warpio terminal process
          // Find warpio installation and run it
          const warpioCommand = `
            # Try to find and run warpio
            if command -v warpio >/dev/null 2>&1; then
              echo "Using warpio from PATH"
              warpio
            elif [ -f /usr/local/bin/warpio ]; then
              echo "Using /usr/local/bin/warpio"
              /usr/local/bin/warpio
            elif [ -f /usr/local/lib/node_modules/@warpio/warpio-cli/bundle/gemini.js ]; then
              echo "Using node to run warpio directly"
              node /usr/local/lib/node_modules/@warpio/warpio-cli/bundle/gemini.js
            else
              echo "❌ Warpio CLI not found. Available commands:"
              ls -la /usr/local/bin/ | grep -i warpio || echo "No warpio in /usr/local/bin/"
              ls -la /usr/local/lib/node_modules/ | grep -i warpio || echo "No warpio in node_modules"
              find /usr/local -name "*warpio*" 2>/dev/null || echo "No warpio files found"
              echo ""
              echo "Starting basic bash shell instead..."
              bash
            fi
          `;
          
          ptyProcess = spawn('bash', ['-c', warpioCommand], {
            name: 'xterm-color',
            cols: 80,
            rows: 24,
            cwd: user.workingDirectory,
            env: {
              ...process.env,
              TERM: 'xterm-256color',
              COLORTERM: 'truecolor',
              PATH: '/usr/local/bin:/usr/bin:/bin:' + (process.env.PATH || ''),
              NODE_PATH: '/usr/local/lib/node_modules',
              GEMINI_API_KEY: user.geminiApiKey || process.env.GEMINI_API_KEY
            }
          });

          ptyProcess.onData((data: string) => {
            socket.emit('data', data);
          });

          ptyProcess.onExit((code: number) => {
            console.log('Warpio process exited with code:', code);
            socket.emit('exit', { code });
          });

          socket.emit('ready');

        } catch (error) {
          console.error('Auth error:', error);
          socket.emit('auth-failed', { error: 'Authentication failed' });
        }
      });

      socket.on('data', (data) => {
        if (ptyProcess) {
          ptyProcess.write(data);
        }
      });

      socket.on('resize', (data) => {
        if (ptyProcess) {
          ptyProcess.resize(data.cols, data.rows);
        }
      });

      socket.on('disconnect', () => {
        console.log('Terminal client disconnected:', socket.id);
        if (ptyProcess) {
          ptyProcess.kill();
          ptyProcess = null;
        }
      });
    });
  }

  private setupStaticFiles() {
    // Serve static files from frontend build
    const frontendPath = path.join(__dirname, '../../terminal-frontend/dist');
    this.app.use(express.static(frontendPath));

    // Serve index.html for all non-API routes (SPA support)
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
        if (err) {
          res.status(404).send(`
            <html>
              <head><title>Warpio Terminal</title></head>
              <body>
                <h1>Warpio Web Terminal</h1>
                <p>Terminal frontend not built yet. Please run the frontend build process.</p>
                <p>API is available at <a href="/api/health">/api/health</a></p>
              </body>
            </html>
          `);
        }
      });
    });
  }

  start(port: number = 3003) {
    return new Promise<void>((resolve) => {
      this.server.listen(port, () => {
        console.log(`🖥️  Warpio Terminal Server running on http://localhost:${port}`);
        console.log(`📺 Web Terminal: http://localhost:${port}`);
        console.log(`📁 File System: http://localhost:${port}/api/files`);
        console.log(`🔍 API Health: http://localhost:${port}/api/health`);
        resolve();
      });
    });
  }

  getApp() {
    return this.app;
  }
}