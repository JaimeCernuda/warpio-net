/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

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

export interface Persona {
  name: string;
  description: string;
}

export class SimpleChatManager {
  private sessions: Map<string, ChatSession> = new Map();
  private chatDir: string;

  constructor() {
    this.chatDir = path.join(homedir(), '.warpio', 'web-server', 'chats');
    this.initializeChatDir();
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
      // For now, return a simple response until we can integrate with Gemini
      const response = await this.generateSimpleResponse(message, session.activePersona);

      // Add assistant response to session
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        type: 'assistant',
        content: response,
        persona: session.activePersona
      };
      session.messages.push(assistantMessage);

      // Save session
      await this.saveSession(session);

      return response;
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

  private async generateSimpleResponse(message: string, persona?: string): Promise<string> {
    // Simple mock responses until we can integrate with Gemini API
    const responses = {
      'data-expert': 'As a data expert, I can help you with scientific data formats like HDF5, ADIOS, and Parquet. What data challenges are you facing?',
      'hpc-expert': 'As an HPC expert, I specialize in high-performance computing, SLURM job scripts, and optimization. How can I help with your computing needs?',
      'analysis-expert': 'As an analysis expert, I can assist with data analysis, visualization, and statistical methods. What would you like to analyze?',
      'research-expert': 'As a research expert, I can help with scientific writing, LaTeX documents, and research workflows. What research task can I assist with?',
      'workflow-expert': 'As a workflow expert, I specialize in scientific workflow orchestration and automation. What workflow challenges do you have?',
      'warpio': 'Hello! I\'m Warpio, your AI assistant for scientific computing and development. How can I help you today?'
    };

    const selectedPersona = persona || 'warpio';
    const baseResponse = responses[selectedPersona as keyof typeof responses] || responses['warpio'];

    // Add some context about the message
    if (message.toLowerCase().includes('help')) {
      return `${baseResponse}\n\nI can help you with:\n- File operations and editing\n- Scientific computing questions\n- Code development\n- Data analysis\n\nWhat specific task would you like assistance with?`;
    }

    if (message.toLowerCase().includes('file')) {
      return `${baseResponse}\n\nI can help you manage files in your workspace. Use the file explorer on the left to browse, edit, upload, or download files. You can also ask me about specific file operations.`;
    }

    return `${baseResponse}\n\nYou said: "${message}"\n\nNote: This is a demo response. To enable full AI capabilities, please set your GEMINI_API_KEY environment variable and restart the server.`;
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

  getAvailablePersonas(): Persona[] {
    return [
      { name: 'warpio', description: 'General-purpose AI assistant for software development and scientific computing' },
      { name: 'data-expert', description: 'Expert in scientific data formats and I/O operations' },
      { name: 'analysis-expert', description: 'Data analysis and visualization specialist' },
      { name: 'hpc-expert', description: 'High-performance computing optimization specialist' },
      { name: 'research-expert', description: 'Research documentation and workflow specialist' },
      { name: 'workflow-expert', description: 'Scientific workflow orchestration specialist' }
    ];
  }
}