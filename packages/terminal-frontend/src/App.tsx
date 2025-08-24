import { useState, useEffect } from 'react'
import { Terminal } from './components/Terminal'
import { LoginForm } from './components/LoginForm'
import { Sidebar } from './components/Sidebar'
import { FileManager } from './components/FileManager'
import { GettingStarted } from './components/GettingStarted'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeView, setActiveView] = useState<'getting-started' | 'terminal' | 'files'>('getting-started')

  useEffect(() => {
    // Check if user is already authenticated
    const savedToken = localStorage.getItem('warpio_terminal_token')
    if (savedToken) {
      validateToken(savedToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  const validateToken = async (tokenToValidate: string) => {
    try {
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenToValidate}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        setToken(tokenToValidate)
        setIsAuthenticated(true)
      } else {
        localStorage.removeItem('warpio_terminal_token')
      }
    } catch (error) {
      console.error('Token validation failed:', error)
      localStorage.removeItem('warpio_terminal_token')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (username: string, password: string) => {
    try {
      // Login with the main web-server through proxy
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        throw new Error('Login failed')
      }

      const data = await response.json()
      const { token: newToken } = data

      localStorage.setItem('warpio_terminal_token', newToken)
      setToken(newToken)
      setIsAuthenticated(true)
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('warpio_terminal_token')
    setToken(null)
    setIsAuthenticated(false)
  }

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        background: '#000', 
        color: '#0f0',
        fontFamily: 'monospace'
      }}>
        Loading Warpio Terminal...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex',
      background: '#000'
    }}>
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView}
        onLogout={handleLogout}
      />
      <div style={{ flex: 1 }}>
        {activeView === 'getting-started' ? (
          <GettingStarted />
        ) : activeView === 'terminal' ? (
          <Terminal token={token!} onLogout={handleLogout} />
        ) : (
          <FileManager token={token!} />
        )}
      </div>
    </div>
  )
}

export default App