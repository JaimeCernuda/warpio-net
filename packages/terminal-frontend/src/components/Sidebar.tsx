
interface SidebarProps {
  activeView: 'terminal' | 'files'
  onViewChange: (view: 'terminal' | 'files') => void
  onLogout: () => void
}

export function Sidebar({ activeView, onViewChange, onLogout }: SidebarProps) {
  return (
    <div style={{
      width: '200px',
      background: '#111',
      borderRight: '1px solid #333',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'monospace',
      color: '#fff'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #333',
        textAlign: 'center'
      }}>
        <h2 style={{
          color: '#0f0',
          margin: 0,
          fontSize: '16px'
        }}>
          🖥️ Warpio
        </h2>
        <div style={{
          fontSize: '12px',
          color: '#666',
          marginTop: '0.25rem'
        }}>
          Web Terminal
        </div>
      </div>

      {/* Navigation */}
      <nav style={{
        flex: 1,
        padding: '1rem'
      }}>
        <button
          onClick={() => onViewChange('terminal')}
          style={{
            display: 'block',
            width: '100%',
            padding: '0.75rem 1rem',
            marginBottom: '0.5rem',
            background: activeView === 'terminal' ? '#0a5c2e' : 'transparent',
            border: activeView === 'terminal' ? '1px solid #0f7c3b' : '1px solid #444',
            color: activeView === 'terminal' ? '#0f0' : '#ccc',
            fontFamily: 'monospace',
            fontSize: '14px',
            cursor: 'pointer',
            textAlign: 'left',
            borderRadius: '4px'
          }}
        >
          🖥️ Terminal
        </button>

        <button
          onClick={() => onViewChange('files')}
          style={{
            display: 'block',
            width: '100%',
            padding: '0.75rem 1rem',
            marginBottom: '0.5rem',
            background: activeView === 'files' ? '#0a5c2e' : 'transparent',
            border: activeView === 'files' ? '1px solid #0f7c3b' : '1px solid #444',
            color: activeView === 'files' ? '#0f0' : '#ccc',
            fontFamily: 'monospace',
            fontSize: '14px',
            cursor: 'pointer',
            textAlign: 'left',
            borderRadius: '4px'
          }}
        >
          📁 Files
        </button>
      </nav>

      {/* Logout */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid #333'
      }}>
        <button
          onClick={onLogout}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: '#444',
            border: '1px solid #666',
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: '12px',
            cursor: 'pointer',
            borderRadius: '4px'
          }}
        >
          Logout
        </button>
      </div>
    </div>
  )
}