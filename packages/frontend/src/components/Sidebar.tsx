import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MessageCircle, FolderOpen, LogOut, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuth()

  const navigation = [
    { name: 'Chat', href: '/', icon: MessageCircle },
    { name: 'Files', href: '/files', icon: FolderOpen },
  ]

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(href)
  }

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-4">
        <h1 className="text-xl font-bold">Warpio</h1>
        <p className="text-sm text-gray-400">AI Computing Interface</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center mb-3">
          <User className="h-5 w-5 mr-2 text-gray-400" />
          <div>
            <div className="text-sm font-medium">{user?.username}</div>
            <div className="text-xs text-gray-400 truncate">
              {user?.workingDirectory}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-colors"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  )
}