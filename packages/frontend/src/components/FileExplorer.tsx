import React, { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, File, Folder, Upload, Plus, Trash2 } from 'lucide-react'
import { fileService, FileItem, DirectoryListing } from '../services/fileService'
import { LoadingSpinner } from './LoadingSpinner'

interface FileExplorerProps {
  onFileSelect: (filePath: string) => void
}

export function FileExplorer({ onFileSelect }: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState('.')
  const [listing, setListing] = useState<DirectoryListing | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    loadDirectory(currentPath)
  }, [currentPath])

  const loadDirectory = async (path: string) => {
    setIsLoading(true)
    try {
      const data = await fileService.listDirectory(path)
      setListing(data)
    } catch (error) {
      console.error('Failed to load directory:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleItemClick = (item: FileItem) => {
    if (item.type === 'directory') {
      const newPath = item.relativePath || item.name
      setCurrentPath(newPath)
    } else {
      onFileSelect(item.relativePath || item.name)
    }
  }

  const handleUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      try {
        await fileService.uploadFile(file, `${currentPath}/${file.name}`)
        loadDirectory(currentPath) // Refresh directory
      } catch (error) {
        console.error('Failed to upload file:', error)
        alert(`Failed to upload ${file.name}`)
      }
    }
    setShowUpload(false)
  }

  const handleDelete = async (item: FileItem) => {
    if (window.confirm(`Are you sure you want to delete ${item.name}?`)) {
      try {
        await fileService.deleteFile(item.relativePath || item.name)
        loadDirectory(currentPath) // Refresh directory
      } catch (error) {
        console.error('Failed to delete file:', error)
        alert(`Failed to delete ${item.name}`)
      }
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

  if (isLoading && !listing) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">File Explorer</h2>
          <div className="flex space-x-1">
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
              title="Upload files"
            >
              <Upload className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-gray-600">
          <button
            onClick={() => setCurrentPath('.')}
            className="hover:text-blue-600 transition-colors"
          >
            ~
          </button>
          {currentPath !== '.' && currentPath.split('/').map((part, index, array) => (
            <React.Fragment key={index}>
              <ChevronRight className="h-4 w-4 mx-1" />
              <button
                onClick={() => setCurrentPath(array.slice(0, index + 1).join('/'))}
                className="hover:text-blue-600 transition-colors"
              >
                {part}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Upload area */}
        {showUpload && (
          <div className="mt-3 p-3 border-2 border-dashed border-gray-300 rounded-lg">
            <input
              type="file"
              multiple
              onChange={(e) => e.target.files && handleUpload(e.target.files)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        )}
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {listing && listing.items.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Folder className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>This directory is empty</p>
          </div>
        ) : (
          <div className="p-2">
            {/* Up directory button */}
            {currentPath !== '.' && (
              <button
                onClick={navigateUp}
                className="w-full flex items-center p-2 text-left hover:bg-gray-50 rounded transition-colors"
              >
                <Folder className="h-4 w-4 mr-2 text-blue-600" />
                <span className="text-sm">.. (up)</span>
              </button>
            )}
            
            {listing?.items.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors group"
              >
                <button
                  onClick={() => handleItemClick(item)}
                  className="flex items-center flex-1 text-left"
                >
                  {item.type === 'directory' ? (
                    <Folder className="h-4 w-4 mr-2 text-blue-600" />
                  ) : (
                    <File className="h-4 w-4 mr-2 text-gray-600" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{item.name}</div>
                    <div className="text-xs text-gray-500">
                      {item.type === 'file' && item.size && formatFileSize(item.size)}
                      {item.modified && ` • ${new Date(item.modified).toLocaleDateString()}`}
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleDelete(item)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}