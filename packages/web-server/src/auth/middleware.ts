/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { UserManager, UserSession } from './userManager.js';

export interface AuthenticatedRequest extends Request {
  user?: UserSession;
}

export class AuthMiddleware {
  private userManager: UserManager;

  constructor(userManager: UserManager) {
    this.userManager = userManager;
  }

  authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

    req.user = user;
    next();
  };

  requireAuth = this.authenticate;

  optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.session?.token ||
                  req.cookies?.auth_token;

    if (token) {
      const user = this.userManager.verifyToken(token);
      if (user) {
        req.user = user;
      }
    }

    next();
  };
}