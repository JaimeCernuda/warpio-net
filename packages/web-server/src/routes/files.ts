/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Response } from 'express';
import { AuthMiddleware, AuthenticatedRequest } from '../auth/middleware.js';
import path from 'path';
import fs from 'fs/promises';
import multer from 'multer';

const upload = multer({ 
  dest: '/tmp/warpio-uploads/',
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

export function createFileRoutes(authMiddleware: AuthMiddleware): Router {
  const router = Router();

  // Ensure user is authenticated for all file operations
  router.use(authMiddleware.requireAuth);

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
  router.get('/ls', async (req: AuthenticatedRequest, res: Response) => {
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
  router.get('/read', async (req: AuthenticatedRequest, res: Response) => {
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
      const isBinary = await isLikelyBinary(fullPath);
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
  router.post('/write', async (req: AuthenticatedRequest, res: Response) => {
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
  router.post('/upload', upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
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
  router.delete('/delete', async (req: AuthenticatedRequest, res: Response) => {
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

  return router;
}

// Helper function to detect binary files
async function isLikelyBinary(filePath: string): Promise<boolean> {
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