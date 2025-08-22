import { useState, useEffect } from 'react'

interface FileItem {
  name: string
  type: 'file' | 'directory'
  size?: number
  modified: string
  relativePath: string
}

interface FileManagerProps {
  token: string
}

export function FileManager({ token }: FileManagerProps) {
  const [currentPath, setCurrentPath] = useState('.')
  const [files, setFiles] = useState<FileItem[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    loadDirectory(currentPath)
  }, [currentPath])

  const loadDirectory = async (path: string) => {
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch(`/api/files/ls?path=${encodeURIComponent(path)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to load directory')
      }
      
      const data = await response.json()
      setFiles(data.items || [])
      setCurrentPath(data.path || path)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory')
    } finally {
      setIsLoading(false)
    }
  }

  const loadFile = async (filePath: string) => {
    try {
      const response = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to load file')
      }
      
      const data = await response.json()
      
      if (data.type === 'binary') {
        setFileContent(`[Binary file: ${data.size} bytes]`)
      } else {
        setFileContent(data.content || '')
      }
      
      setSelectedFile(filePath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file')
    }
  }

  const saveFile = async () => {
    if (!selectedFile) return
    
    try {
      const response = await fetch('/api/files/write', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: selectedFile,
          content: fileContent
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save file')
      }
      
      alert('File saved successfully!')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save file')
    }
  }

  const navigateUp = () => {
    if (currentPath !== '.' && currentPath !== '') {
      const parentPath = currentPath.split('/').slice(0, -1).join('/') || '.'
      setCurrentPath(parentPath)
    }
  }

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      background: '#000',
      color: '#fff',
      fontFamily: 'monospace'
    }}>
      {/* File Browser */}
      <div style={{
        width: '300px',
        borderRight: '1px solid #333',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Path Header */}
        <div style={{
          padding: '0.75rem',
          borderBottom: '1px solid #333',
          background: '#111'
        }}>
          <div style={{ fontSize: '14px', color: '#0f0', marginBottom: '0.5rem' }}>
            📁 File Browser
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Path: {currentPath === '.' ? '~' : currentPath}
          </div>
          {currentPath !== '.' && (
            <button
              onClick={navigateUp}
              style={{
                marginTop: '0.5rem',
                padding: '0.25rem 0.5rem',
                background: '#333',
                border: '1px solid #555',
                color: '#ccc',
                fontSize: '11px',
                cursor: 'pointer',
                fontFamily: 'monospace'
              }}
            >
              ← Up
            </button>
          )}
        </div>

        {/* File List */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '0.5rem'
        }}>
          {isLoading && (
            <div style={{ padding: '1rem', color: '#666' }}>
              Loading...
            </div>
          )}
          
          {error && (
            <div style={{ padding: '1rem', color: '#f44' }}>
              Error: {error}
            </div>
          )}
          
          {!isLoading && !error && files.map((file) => (
            <div
              key={file.name}
              onClick={() => {
                if (file.type === 'directory') {
                  setCurrentPath(file.relativePath || file.name)
                } else {
                  loadFile(file.relativePath || file.name)
                }
              }}
              style={{
                padding: '0.5rem',
                marginBottom: '0.25rem',
                background: selectedFile === (file.relativePath || file.name) ? '#0a5c2e' : 'transparent',
                border: '1px solid transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
              onMouseEnter={(e) => {
                if (selectedFile !== (file.relativePath || file.name)) {
                  e.currentTarget.style.background = '#222'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedFile !== (file.relativePath || file.name)) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '0.5rem' }}>
                  {file.type === 'directory' ? '📁' : '📄'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    color: file.type === 'directory' ? '#4a9eff' : '#fff',
                    wordBreak: 'break-word'
                  }}>
                    {file.name}
                  </div>
                  <div style={{ color: '#666', fontSize: '10px' }}>
                    {file.type === 'file' && file.size && formatFileSize(file.size)}
                    {file.modified && ` • ${new Date(file.modified).toLocaleDateString()}`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* File Editor */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {selectedFile ? (
          <>
            {/* Editor Header */}
            <div style={{
              padding: '0.75rem',
              borderBottom: '1px solid #333',
              background: '#111',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ color: '#0f0', fontSize: '14px' }}>
                  📝 {selectedFile}
                </div>
              </div>
              <button
                onClick={saveFile}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#0a5c2e',
                  border: '1px solid #0f7c3b',
                  color: '#0f0',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  cursor: 'pointer',
                  borderRadius: '4px'
                }}
              >
                Save
              </button>
            </div>

            {/* Editor */}
            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              style={{
                flex: 1,
                background: '#000',
                color: '#fff',
                border: 'none',
                padding: '1rem',
                fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                fontSize: '14px',
                lineHeight: '1.5',
                resize: 'none',
                outline: 'none'
              }}
              placeholder="Select a file to edit..."
            />
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📁</div>
              <div>Select a file to view or edit</div>
              <div style={{ fontSize: '12px', marginTop: '0.5rem' }}>
                Click on a file in the browser to open it
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}