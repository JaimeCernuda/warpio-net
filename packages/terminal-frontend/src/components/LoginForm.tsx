import React, { useState } from 'react'

interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<void>
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await onLogin(username, password)
    } catch (error) {
      setError('Invalid credentials. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#000',
      fontFamily: 'monospace'
    }}>
      <div style={{
        background: '#111',
        border: '1px solid #333',
        padding: '2rem',
        borderRadius: '8px',
        minWidth: '300px'
      }}>
        <h2 style={{ color: '#0f0', textAlign: 'center', marginBottom: '1.5rem' }}>
          Warpio Terminal
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                background: '#222',
                border: '1px solid #444',
                color: '#0f0',
                fontFamily: 'monospace',
                fontSize: '14px'
              }}
              disabled={isLoading}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                background: '#222',
                border: '1px solid #444',
                color: '#0f0',
                fontFamily: 'monospace',
                fontSize: '14px'
              }}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div style={{ 
              color: '#f44', 
              fontSize: '12px', 
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#0a5c2e',
              border: '1px solid #0f7c3b',
              color: '#0f0',
              fontFamily: 'monospace',
              fontSize: '14px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? 'Connecting...' : 'Connect to Terminal'}
          </button>
        </form>

      </div>
    </div>
  )
}