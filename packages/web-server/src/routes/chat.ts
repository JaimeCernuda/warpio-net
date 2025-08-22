/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Response } from 'express';
import { AuthMiddleware, AuthenticatedRequest } from '../auth/middleware.js';
import { SimpleChatManager } from '../chat/simpleChatManager.js';

export function createChatRoutes(authMiddleware: AuthMiddleware, chatManager: SimpleChatManager): Router {
  const router = Router();

  // Ensure user is authenticated for all chat operations
  router.use(authMiddleware.requireAuth);

  // Send a message to warpio
  router.post('/message', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { message, persona } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const sessionId = req.user!.userId;
      const response = await chatManager.sendMessage(sessionId, message, persona, req.user!.workingDirectory);
      
      res.json({
        success: true,
        response,
        persona: persona || 'warpio'
      });
    } catch (error) {
      console.error('Chat message error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to process message' });
    }
  });

  // Get chat history
  router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sessionId = req.user!.userId;
      const history = await chatManager.getChatHistory(sessionId);
      
      res.json({ history });
    } catch (error) {
      console.error('Chat history error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get chat history' });
    }
  });

  // Clear chat history
  router.delete('/history', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sessionId = req.user!.userId;
      await chatManager.clearChatHistory(sessionId);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Clear chat history error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to clear chat history' });
    }
  });

  // Get available personas
  router.get('/personas', (req: AuthenticatedRequest, res: Response) => {
    try {
      const personas = chatManager.getAvailablePersonas();
      res.json({ personas });
    } catch (error) {
      console.error('Get personas error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get personas' });
    }
  });

  return router;
}