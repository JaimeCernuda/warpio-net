/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config, GeminiChat, PersonaManager } from '@google/gemini-cli-core';
import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';

export interface ChatMessage {
  id: string;
  timestamp: string;
  type: 'user' | 'assistant';
  content: string;
  persona?: string;
}

export interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  workingDirectory: string;
  activePersona?: string;
}

export class WarpioWebChatManager {
  private sessions: Map<string, ChatSession> = new Map();
  private chatDir: string;
  private config: Config;

  constructor() {
    this.chatDir = path.join(homedir(), '.warpio', 'web-server', 'chats');
    this.initializeChatDir();
    
    // Initialize warpio config
    this.config = {
      model: 'gemini-2.0-flash-exp',
      apiKey: process.env.GEMINI_API_KEY || '',
      workspaceRoot: process.cwd(),
      sessionId: () => `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      logUserPrompt: (prompt: string) => {
        console.log('User prompt:', prompt);
      },
      authType: 'apikey' as const,
      approvalMode: 'auto' as const,
      tools: {
        edit: 'enabled' as const,
        shell: 'enabled' as const,
        writeFile: 'enabled' as const
      }
    };
  }

  private async initializeChatDir() {
    try {
      await fs.mkdir(this.chatDir, { recursive: true });
    } catch (error) {
      console.error('Failed to initialize chat directory:', error);
    }
  }

  private async loadSession(sessionId: string): Promise<ChatSession> {
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)!;
    }

    try {
      const sessionFile = path.join(this.chatDir, `${sessionId}.json`);
      const data = await fs.readFile(sessionFile, 'utf8');
      const session = JSON.parse(data) as ChatSession;
      this.sessions.set(sessionId, session);
      return session;
    } catch {
      // Create new session if file doesn't exist
      const session: ChatSession = {
        sessionId,
        messages: [],
        workingDirectory: process.cwd()
      };
      this.sessions.set(sessionId, session);
      return session;
    }
  }

  private async saveSession(session: ChatSession) {
    try {
      const sessionFile = path.join(this.chatDir, `${session.sessionId}.json`);
      await fs.writeFile(sessionFile, JSON.stringify(session, null, 2));
    } catch (error) {
      console.error('Failed to save chat session:', error);
    }
  }

  async sendMessage(sessionId: string, message: string, persona?: string, workingDirectory?: string): Promise<string> {
    const session = await this.loadSession(sessionId);
    
    // Update working directory if provided
    if (workingDirectory) {
      session.workingDirectory = workingDirectory;
    }

    // Update active persona if provided
    if (persona) {
      session.activePersona = persona;
    }

    // Add user message to session
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: 'user',
      content: message,
      persona: session.activePersona
    };
    session.messages.push(userMessage);

    try {
      // Create config for this session
      const sessionConfig: Config = {
        ...this.config,
        workspaceRoot: session.workingDirectory,
        sessionId: () => sessionId
      };

      // Create chat instance
      const chat = new GeminiChat(sessionConfig);

      // Load persona if specified
      let systemPrompt = '';
      if (session.activePersona) {
        const personaDefinition = PersonaManager.loadPersona(session.activePersona);
        if (personaDefinition) {
          systemPrompt = personaDefinition.systemPrompt;
        }
      }

      // Build conversation history for context
      const conversationHistory = session.messages
        .slice(-10) // Keep last 10 messages for context
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'model' as const,
          parts: [{ text: msg.content }]
        }));

      // Send message and get response
      const response = await chat.sendMessage(message, {
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
        history: conversationHistory.slice(0, -1) // Exclude the current message from history
      });

      // Extract text response
      const responseText = response.response.text();

      // Add assistant response to session
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        type: 'assistant',
        content: responseText,
        persona: session.activePersona
      };
      session.messages.push(assistantMessage);

      // Save session
      await this.saveSession(session);

      return responseText;
    } catch (error) {
      console.error('Error in chat:', error);
      
      // Add error message to session
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        type: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        persona: session.activePersona
      };
      session.messages.push(errorMessage);
      
      await this.saveSession(session);
      throw error;
    }
  }

  async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    const session = await this.loadSession(sessionId);
    return session.messages;
  }

  async clearChatHistory(sessionId: string) {
    const session = await this.loadSession(sessionId);
    session.messages = [];
    await this.saveSession(session);
  }

  getAvailablePersonas() {
    return PersonaManager.listPersonas().map(name => {
      const definition = PersonaManager.loadPersona(name);
      return {
        name,
        description: definition?.description || 'No description available'
      };
    });
  }
}