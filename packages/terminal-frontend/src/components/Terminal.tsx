import { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { io, Socket } from 'socket.io-client'
import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
  token: string
  onLogout: () => void
}

export function Terminal({ token, onLogout }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('Initializing...')

  useEffect(() => {
    if (!terminalRef.current) return

    // Initialize xterm.js
    const xterm = new XTerm({
      theme: {
        background: '#000000',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selectionBackground: '#ffffff33',
      },
      fontSize: 14,
      fontFamily: '"Cascadia Code", "Fira Code", "SF Mono", Monaco, "Inconsolata", "Roboto Mono", "Source Code Pro", monospace',
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 1000,
      tabStopWidth: 4,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()
    
    xterm.loadAddon(fitAddon)
    xterm.loadAddon(webLinksAddon)

    xterm.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = xterm

    // Initialize socket connection - use current host for WebSocket
    const socketUrl = window.location.protocol === 'https:' 
      ? `wss://${window.location.host}` 
      : `ws://${window.location.host}`;
    
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnectionStatus('Authenticating...')
      socket.emit('auth', { token })
    })

    socket.on('auth-success', (_data: any) => {
      setConnectionStatus('Starting Warpio...')
      setIsConnected(true)
    })

    socket.on('auth-failed', (_data: any) => {
      setConnectionStatus('Authentication failed')
      xterm.writeln('\r\n\x1b[31mAuthentication failed. Please refresh and try again.\x1b[0m')
    })

    socket.on('ready', () => {
      setConnectionStatus('Connected')
      xterm.writeln('\r\n\x1b[32m🚀 Connected to Warpio CLI\x1b[0m')
      xterm.writeln('\x1b[36mType your commands below. Press Ctrl+C to exit.\x1b[0m\r\n')
    })

    socket.on('data', (data: string) => {
      xterm.write(data)
    })

    socket.on('exit', (data: any) => {
      xterm.writeln(`\r\n\x1b[33mWarpio process exited with code: ${data.code}\x1b[0m`)
      xterm.writeln('\x1b[36mRefresh the page to restart.\x1b[0m')
      setIsConnected(false)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      setConnectionStatus('Disconnected')
      xterm.writeln('\r\n\x1b[31mDisconnected from server\x1b[0m')
    })

    // Handle terminal input
    xterm.onData((data: string) => {
      if (socket.connected) {
        socket.emit('data', data)
      }
    })

    // Handle terminal resize
    const handleResize = () => {
      fitAddon.fit()
      if (socket.connected) {
        socket.emit('resize', { cols: xterm.cols, rows: xterm.rows })
      }
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      socket.disconnect()
      xterm.dispose()
    }
  }, [token])

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      background: '#000',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        background: '#111',
        padding: '0.5rem 1rem',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '14px',
        fontFamily: 'monospace'
      }}>
        <div style={{ color: '#0f0' }}>
          🖥️ Warpio Terminal - {connectionStatus}
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ 
            color: isConnected ? '#0f0' : '#f44',
            fontSize: '12px'
          }}>
            ● {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          <button
            onClick={onLogout}
            style={{
              background: '#444',
              border: '1px solid #666',
              color: '#fff',
              padding: '0.25rem 0.5rem',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'monospace'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Terminal */}
      <div 
        ref={terminalRef} 
        style={{ 
          flex: 1,
          padding: '0.5rem'
        }} 
      />
    </div>
  )
}