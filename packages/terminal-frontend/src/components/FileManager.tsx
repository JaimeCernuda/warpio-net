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
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFileType, setSelectedFileType] = useState<'text' | 'binary' | 'image'>('text')
  const [imageUrl, setImageUrl] = useState<string>('')

  useEffect(() => {
    loadDirectory(currentPath)
  }, [currentPath])

  const isImageFile = (fileName: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
    return imageExtensions.includes(extension)
  }

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
      console.log('File API response:', data) // Debug logging
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
      // Clean up previous image URL to prevent memory leaks
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
        setImageUrl('');
      }
      
      // Check if it's an image file
      if (isImageFile(filePath)) {
        setSelectedFileType('image')
        setFileContent('') // Clear text content for images
        setSelectedFile(filePath)
        
        // Fetch image as blob and create object URL
        const imageResponse = await fetch(`/api/files/raw?path=${encodeURIComponent(filePath)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (imageResponse.ok) {
          const blob = await imageResponse.blob();
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
        } else {
          setError('Failed to load image');
        }
        return
      }

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
        setSelectedFileType('binary')
        setFileContent(`[Binary file: ${data.size} bytes]`)
      } else {
        setSelectedFileType('text')
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

  const uploadFile = async (file: File) => {
    setIsUploading(true)
    setError('')
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('path', file.name) // Upload to current directory with original filename
      
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Failed to upload file')
      }
      
      // Small delay to ensure file is fully written, then refresh
      await new Promise(resolve => setTimeout(resolve, 100))
      await loadDirectory(currentPath)
      alert('File uploaded successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      uploadFile(file)
    }
    // Clear the input so the same file can be uploaded again
    event.target.value = ''
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
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            {currentPath !== '.' && (
              <button
                onClick={navigateUp}
                style={{
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
            <button
              onClick={() => loadDirectory(currentPath)}
              disabled={isLoading}
              style={{
                padding: '0.25rem 0.5rem',
                background: isLoading ? '#666' : '#333',
                border: '1px solid #555',
                color: isLoading ? '#ccc' : '#0ff',
                fontSize: '11px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'monospace'
              }}
            >
              {isLoading ? '⏳ Loading...' : '🔄 Refresh'}
            </button>
            <label
              style={{
                padding: '0.25rem 0.5rem',
                background: isUploading ? '#666' : '#0a5c2e',
                border: '1px solid #0f7c3b',
                color: isUploading ? '#ccc' : '#0f0',
                fontSize: '11px',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                fontFamily: 'monospace'
              }}
            >
              {isUploading ? '⏳ Uploading...' : '📤 Upload File'}
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={isUploading}
                style={{ display: 'none' }}
              />
            </label>
          </div>
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
          
          {!isLoading && !error && files.length === 0 && (
            <div style={{ padding: '1rem', color: '#666' }}>
              No files found in this directory
            </div>
          )}
          
          {!isLoading && !error && files.length > 0 && files.map((file) => (
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
                  {selectedFileType === 'image' ? '🖼️' : selectedFileType === 'binary' ? '📄' : '📝'} {selectedFile}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '0.25rem' }}>
                  {selectedFileType === 'image' ? 'Image Preview' : selectedFileType === 'binary' ? 'Binary File' : 'Text Editor'}
                </div>
              </div>
              {selectedFileType === 'text' && (
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
              )}
            </div>

            {/* Editor/Viewer */}
            {selectedFileType === 'image' ? (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#000',
                padding: '1rem'
              }}>
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={selectedFile}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      border: '1px solid #333',
                      borderRadius: '4px'
                    }}
                    onLoad={() => console.log('Image loaded successfully')}
                    onError={() => setError('Failed to load image')}
                  />
                ) : (
                  <div style={{ color: '#666', textAlign: 'center' }}>
                    Loading image...
                  </div>
                )}
              </div>
            ) : selectedFileType === 'binary' ? (
              <div style={{
                flex: 1,
                background: '#000',
                color: '#666',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Monaco, Consolas, "Courier New", monospace'
              }}>
                {fileContent}
              </div>
            ) : (
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
            )}
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