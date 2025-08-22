import React, { useState, useEffect } from 'react'
import { Save, X, Download } from 'lucide-react'
import { fileService, FileContent } from '../services/fileService'
import { LoadingSpinner } from './LoadingSpinner'
import Editor from '@monaco-editor/react'

interface FileEditorProps {
  filePath: string
  onClose: () => void
}

export function FileEditor({ filePath, onClose }: FileEditorProps) {
  const [fileContent, setFileContent] = useState<FileContent | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [editorContent, setEditorContent] = useState('')

  useEffect(() => {
    loadFile()
  }, [filePath])

  const loadFile = async () => {
    setIsLoading(true)
    try {
      const content = await fileService.readFile(filePath)
      setFileContent(content)
      setEditorContent(content.content || '')
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to load file:', error)
      alert('Failed to load file')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!hasChanges) return
    
    setIsSaving(true)
    try {
      await fileService.writeFile(filePath, editorContent)
      setHasChanges(false)
      // Update file content state
      if (fileContent) {
        setFileContent({
          ...fileContent,
          content: editorContent,
          modified: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Failed to save file:', error)
      alert('Failed to save file')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditorChange = (value: string | undefined) => {
    const newContent = value || ''
    setEditorContent(newContent)
    setHasChanges(newContent !== (fileContent?.content || ''))
  }

  const handleDownload = () => {
    if (!fileContent) return
    
    const blob = new Blob([editorContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filePath.split('/').pop() || 'file.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'md': 'markdown',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'sh': 'shell',
      'bash': 'shell',
      'sql': 'sql',
      'c': 'c',
      'cpp': 'cpp',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
    }
    return languageMap[ext || ''] || 'plaintext'
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  if (!fileContent) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">File not found</h3>
          <p>The file could not be loaded.</p>
        </div>
      </div>
    )
  }

  if (fileContent.type === 'binary') {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold truncate">{filePath}</h2>
            <p className="text-sm text-gray-600">Binary file ({fileContent.size} bytes)</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleDownload}
              className="btn btn-secondary"
              title="Download file"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="btn btn-secondary"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Binary File</h3>
            <p>This file cannot be edited in the text editor.</p>
            <button
              onClick={handleDownload}
              className="btn btn-primary mt-4"
            >
              <Download className="h-4 w-4 mr-2" />
              Download File
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{filePath}</h2>
          <p className="text-sm text-gray-600">
            {fileContent.size} bytes • Modified {new Date(fileContent.modified).toLocaleString()}
            {hasChanges && <span className="text-orange-600 ml-2">• Unsaved changes</span>}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="btn btn-primary"
            title="Save file"
          >
            {isSaving ? (
              <LoadingSpinner className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={handleDownload}
            className="btn btn-secondary"
            title="Download file"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor
          value={editorContent}
          onChange={handleEditorChange}
          language={getLanguage(filePath)}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  )
}