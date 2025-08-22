/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  workingDirectory: string;
  geminiApiKey?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface UserSession {
  userId: string;
  username: string;
  workingDirectory: string;
  geminiApiKey?: string;
}

export class UserManager {
  private usersFile: string;
  private jwtSecret: string;

  constructor() {
    const configDir = path.join(homedir(), '.warpio', 'web-server');
    this.usersFile = path.join(configDir, 'users.json');
    this.jwtSecret = process.env.WARPIO_JWT_SECRET || 'warpio-default-secret-change-in-production';
    this.initializeUsersFile();
  }

  private async initializeUsersFile() {
    try {
      const configDir = path.dirname(this.usersFile);
      await fs.mkdir(configDir, { recursive: true });
      
      // Check if users file exists, if not create with default user
      try {
        await fs.access(this.usersFile);
      } catch {
        await this.createDefaultUser();
      }
    } catch (error) {
      console.error('Failed to initialize users file:', error);
    }
  }

  private async createDefaultUser() {
    const defaultUser: User = {
      id: 'default-user',
      username: 'warpio',
      passwordHash: await bcrypt.hash('warpio123', 10),
      workingDirectory: process.cwd(),
      createdAt: new Date().toISOString()
    };

    await this.saveUsers([defaultUser]);
    console.log('Created default user: warpio / warpio123');
  }

  private async loadUsers(): Promise<User[]> {
    try {
      const data = await fs.readFile(this.usersFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private async saveUsers(users: User[]) {
    await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2));
  }

  async createUser(username: string, password: string, workingDirectory?: string, geminiApiKey?: string): Promise<User> {
    const users = await this.loadUsers();
    
    if (users.find(u => u.username === username)) {
      throw new Error('Username already exists');
    }

    const user: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username,
      passwordHash: await bcrypt.hash(password, 10),
      workingDirectory: workingDirectory || process.cwd(),
      geminiApiKey,
      createdAt: new Date().toISOString()
    };

    users.push(user);
    await this.saveUsers(users);
    
    return user;
  }

  async authenticateUser(username: string, password: string): Promise<UserSession | null> {
    const users = await this.loadUsers();
    const user = users.find(u => u.username === username);
    
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    await this.saveUsers(users);

    return {
      userId: user.id,
      username: user.username,
      workingDirectory: user.workingDirectory,
      geminiApiKey: user.geminiApiKey
    };
  }

  generateToken(session: UserSession): string {
    return jwt.sign(session, this.jwtSecret, { expiresIn: '24h' });
  }

  verifyToken(token: string): UserSession | null {
    try {
      return jwt.verify(token, this.jwtSecret) as UserSession;
    } catch {
      return null;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    const users = await this.loadUsers();
    return users.find(u => u.id === userId) || null;
  }

  async listUsers(): Promise<Omit<User, 'passwordHash'>[]> {
    const users = await this.loadUsers();
    return users.map(({ passwordHash, ...user }) => user);
  }
}