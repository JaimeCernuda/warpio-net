import { api } from './authService'

export interface FileItem {
  name: string
  type: 'file' | 'directory'
  size?: number
  modified: string
  relativePath: string
}

export interface DirectoryListing {
  path: string
  items: FileItem[]
}

export interface FileContent {
  path: string
  type: 'text' | 'binary'
  content?: string
  size: number
  modified: string
}

export const fileService = {
  async listDirectory(path: string = '.'): Promise<DirectoryListing> {
    const response = await api.get<DirectoryListing>('/files/ls', {
      params: { path },
    })
    return response.data
  },

  async readFile(path: string): Promise<FileContent> {
    const response = await api.get<FileContent>('/files/read', {
      params: { path },
    })
    return response.data
  },

  async writeFile(path: string, content: string): Promise<void> {
    await api.post('/files/write', {
      path,
      content,
    })
  },

  async deleteFile(path: string): Promise<void> {
    await api.delete('/files/delete', {
      params: { path },
    })
  },

  async uploadFile(file: File, targetPath?: string): Promise<void> {
    const formData = new FormData()
    formData.append('file', file)
    if (targetPath) {
      formData.append('path', targetPath)
    }

    await api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
}