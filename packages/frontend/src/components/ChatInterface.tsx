import React, { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, Trash2 } from 'lucide-react'
import { chatService, ChatMessage, Persona } from '../services/chatService'
import { LoadingSpinner } from './LoadingSpinner'

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [personas, setPersonas] = useState<Persona[]>([])
  const [selectedPersona, setSelectedPersona] = useState<string>('warpio')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadChatHistory()
    loadPersonas()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadChatHistory = async () => {
    try {
      const history = await chatService.getChatHistory()
      setMessages(history)
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  }

  const loadPersonas = async () => {
    try {
      const personaList = await chatService.getPersonas()
      setPersonas(personaList)
    } catch (error) {
      console.error('Failed to load personas:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'user',
      content: inputMessage,
      persona: selectedPersona
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await chatService.sendMessage(inputMessage, selectedPersona)
      
      const assistantMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'assistant',
        content: response.response,
        persona: selectedPersona
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your message.',
        persona: selectedPersona
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      try {
        await chatService.clearChatHistory()
        setMessages([])
      } catch (error) {
        console.error('Failed to clear chat history:', error)
      }
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Chat with Warpio</h2>
            <div className="flex items-center mt-2">
              <label htmlFor="persona-select" className="text-sm text-gray-600 mr-2">
                Persona:
              </label>
              <select
                id="persona-select"
                value={selectedPersona}
                onChange={(e) => setSelectedPersona(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                {personas.map((persona) => (
                  <option key={persona.name} value={persona.name}>
                    {persona.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleClearHistory}
            className="p-2 text-gray-500 hover:text-red-600 transition-colors"
            title="Clear chat history"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
            <p>Ask Warpio anything about your project, files, or scientific computing.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.type === 'assistant' && (
                <div className="flex-shrink-0">
                  <Bot className="h-6 w-6 text-blue-600" />
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                <div
                  className={`text-xs mt-1 ${
                    message.type === 'user' ? 'text-blue-200' : 'text-gray-500'
                  }`}
                >
                  {formatTimestamp(message.timestamp)}
                  {message.persona && message.persona !== 'warpio' && (
                    <span className="ml-2">({message.persona})</span>
                  )}
                </div>
              </div>
              {message.type === 'user' && (
                <div className="flex-shrink-0">
                  <User className="h-6 w-6 text-gray-600" />
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex items-start space-x-3">
            <Bot className="h-6 w-6 text-blue-600" />
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <LoadingSpinner className="h-4 w-4" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 input"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="btn btn-primary px-3 py-2"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        {selectedPersona !== 'warpio' && (
          <div className="mt-2 text-xs text-gray-500">
            Active persona: <strong>{selectedPersona}</strong> - {personas.find(p => p.name === selectedPersona)?.description}
          </div>
        )}
      </div>
    </div>
  )
}