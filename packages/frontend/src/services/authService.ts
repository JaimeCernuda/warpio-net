import axios from 'axios'

export interface User {
  username: string
  workingDirectory: string
}

export interface LoginResponse {
  success: boolean
  token: string
  user: User
}

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('warpio_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('warpio_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', {
      username,
      password,
    })
    
    if (response.data.token) {
      localStorage.setItem('warpio_token', response.data.token)
    }
    
    return response.data
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout')
    } finally {
      localStorage.removeItem('warpio_token')
    }
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<{ user: User }>('/auth/me')
    return response.data.user
  },
}

export { api }