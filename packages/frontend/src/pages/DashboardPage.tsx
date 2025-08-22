import React, { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { ChatInterface } from '../components/ChatInterface'
import { FileExplorer } from '../components/FileExplorer'
import { FileEditor } from '../components/FileEditor'

export function DashboardPage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  return (
    <div className="h-screen flex">
      <Sidebar />
      <div className="flex-1 flex">
        <div className="w-1/3 border-r border-gray-200">
          <Routes>
            <Route
              path="/files/*"
              element={<FileExplorer onFileSelect={setSelectedFile} />}
            />
            <Route path="/*" element={<ChatInterface />} />
          </Routes>
        </div>
        <div className="flex-1">
          {selectedFile ? (
            <FileEditor filePath={selectedFile} onClose={() => setSelectedFile(null)} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">Welcome to Warpio</h3>
                <p>Select a file to edit or start a conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}