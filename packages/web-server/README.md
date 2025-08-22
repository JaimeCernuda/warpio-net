# Warpio Web Server

Express.js backend for the Warpio Web Interface, providing API endpoints for authentication, file operations, and chat functionality.

## Features

- **RESTful API**: Clean API design for frontend integration
- **Authentication**: JWT-based auth with session management
- **File Operations**: Secure file system access within user workspace
- **Chat Integration**: Direct integration with Warpio core chat engine
- **Security**: Rate limiting, input validation, and access controls

## Quick Start

```bash
# Install dependencies
npm install

# Set environment variables
export GEMINI_API_KEY="your-api-key"

# Development mode
npm run dev

# Production build and start
npm run build
npm start
```

## API Documentation

### Authentication Endpoints

#### POST /api/auth/login
Login with username and password.

**Request:**
```json
{
  "username": "warpio",
  "password": "warpio123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "username": "warpio",
    "workingDirectory": "/path/to/workspace"
  }
}
```

#### GET /api/auth/me
Get current user information (requires authentication).

**Response:**
```json
{
  "user": {
    "username": "warpio",
    "workingDirectory": "/path/to/workspace"
  }
}
```

### File Endpoints

#### GET /api/files/ls?path=<path>
List directory contents.

**Response:**
```json
{
  "path": ".",
  "items": [
    {
      "name": "file.txt",
      "type": "file",
      "size": 1024,
      "modified": "2025-01-22T10:00:00Z",
      "relativePath": "file.txt"
    }
  ]
}
```

#### GET /api/files/read?path=<path>
Read file contents.

**Response:**
```json
{
  "path": "file.txt",
  "type": "text",
  "content": "file contents",
  "size": 13,
  "modified": "2025-01-22T10:00:00Z"
}
```

### Chat Endpoints

#### POST /api/chat/message
Send message to Warpio agent.

**Request:**
```json
{
  "message": "Hello, how can you help?",
  "persona": "data-expert"
}
```

**Response:**
```json
{
  "success": true,
  "response": "I'm a data expert specialized in...",
  "persona": "data-expert"
}
```

## Configuration

### Environment Variables

- `GEMINI_API_KEY`: Required Gemini API key
- `WARPIO_JWT_SECRET`: JWT signing secret
- `WARPIO_SESSION_SECRET`: Express session secret
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment mode

### User Storage

Users are stored in `~/.warpio/web-server/users.json`:

```json
[
  {
    "id": "default-user",
    "username": "warpio", 
    "passwordHash": "$2b$10$...",
    "workingDirectory": "/path/to/workspace",
    "createdAt": "2025-01-22T10:00:00Z",
    "lastLogin": "2025-01-22T10:00:00Z"
  }
]
```

### Chat Sessions

Chat history stored in `~/.warpio/web-server/chats/<session-id>.json`.

## Security

- **Input Validation**: All inputs sanitized and validated
- **Path Traversal Protection**: Users restricted to working directory
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Secure Headers**: Helmet.js security headers
- **HTTPS Ready**: Production-ready SSL support

## Development

### Project Structure

```
src/
├── auth/
│   ├── userManager.ts      # User management
│   └── middleware.ts       # Auth middleware
├── routes/
│   ├── auth.ts            # Auth endpoints
│   ├── files.ts           # File endpoints
│   └── chat.ts            # Chat endpoints
├── chat/
│   └── chatManager.ts     # Chat integration
├── server.ts              # Express server setup
└── index.ts               # Entry point
```

### Adding New Routes

1. Create route file in `src/routes/`
2. Import and register in `src/server.ts`
3. Add authentication middleware if needed
4. Update API documentation

### Testing

```bash
# Run tests
npm test

# Test with curl
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"warpio","password":"warpio123"}'
```