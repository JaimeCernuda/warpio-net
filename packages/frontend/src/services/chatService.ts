import { api } from './authService'

export interface ChatMessage {
  id: string
  timestamp: string
  type: 'user' | 'assistant'
  content: string
  persona?: string
}

export interface Persona {
  name: string
  description: string
}

export interface ChatResponse {
  success: boolean
  response: string
  persona: string
}

export const chatService = {
  async sendMessage(message: string, persona?: string): Promise<ChatResponse> {
    const response = await api.post<ChatResponse>('/chat/message', {
      message,
      persona,
    })
    return response.data
  },

  async getChatHistory(): Promise<ChatMessage[]> {
    const response = await api.get<{ history: ChatMessage[] }>('/chat/history')
    return response.data.history
  },

  async clearChatHistory(): Promise<void> {
    await api.delete('/chat/history')
  },

  async getPersonas(): Promise<Persona[]> {
    const response = await api.get<{ personas: Persona[] }>('/chat/personas')
    return response.data.personas
  },
}