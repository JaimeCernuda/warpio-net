/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { UserManager } from '../auth/userManager.js';
import { AuthMiddleware, AuthenticatedRequest } from '../auth/middleware.js';

export function createAuthRoutes(userManager: UserManager, authMiddleware: AuthMiddleware): Router {
  const router = Router();

  // Login endpoint
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const session = await userManager.authenticateUser(username, password);
      if (!session) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = userManager.generateToken(session);
      
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

  // Logout endpoint
  router.post('/logout', (req: Request, res: Response) => {
    req.session?.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
      }
    });
    res.clearCookie('auth_token');
    res.json({ success: true });
  });

  // Get current user info
  router.get('/me', authMiddleware.requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({
      user: {
        username: req.user!.username,
        workingDirectory: req.user!.workingDirectory
      }
    });
  });

  // Create new user (admin only for now)
  router.post('/users', authMiddleware.requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { username, password, workingDirectory, geminiApiKey } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const user = await userManager.createUser(username, password, workingDirectory, geminiApiKey);
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
  router.get('/users', authMiddleware.requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await userManager.listUsers();
      res.json({ users });
    } catch (error) {
      console.error('List users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}