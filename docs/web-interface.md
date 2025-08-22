# Warpio Web Interface

The Warpio Web Interface provides browser-based access to the powerful AI agent capabilities of Warpio CLI, complete with file management and real-time chat functionality.

## Features

- **Web-based Chat Interface**: Interact with Warpio agents through a modern web UI
- **Multi-agent Personas**: Switch between specialized AI experts (data-expert, hpc-expert, etc.)
- **File Explorer**: Browse, edit, upload, and download files in your working directory
- **Code Editor**: Full-featured Monaco editor with syntax highlighting
- **Secure Authentication**: Username/password authentication with session management
- **Real-time Updates**: Live chat and file operations

## Quick Start

### 1. Install Dependencies

```bash
# From the warpio-cli root directory
npm install
```

### 2. Set Environment Variables

```bash
export GEMINI_API_KEY="your-gemini-api-key"
export WARPIO_JWT_SECRET="your-jwt-secret"  # Optional, defaults to development key
export WARPIO_SESSION_SECRET="your-session-secret"  # Optional
```

### 3. Build and Start

```bash
# Build both web server and frontend
npm run build:web

# Or run in development mode with hot reload
npm run dev:web
```

### 4. Access the Interface

Open your browser to: http://localhost:3000

**Default credentials**: `warpio` / `warpio123`

## Architecture

```
┌─────────────────────────────────────────┐
│         React Frontend (Port 3000)      │
│  ┌─────────────────────────────────────┐ │
│  │  - Chat Interface                   │ │
│  │  - File Explorer                    │ │
│  │  │  - Code Editor                   │ │
│  │  - Authentication                   │ │
│  └─────────────────────────────────────┘ │
└─────────────────┬───────────────────────┘
                  │ HTTP API Calls
                  ▼
┌─────────────────────────────────────────┐
│      Express.js Server (Port 3001)      │
│  ┌─────────────────────────────────────┐ │
│  │  - Authentication API               │ │
│  │  - File Operations API              │ │
│  │  - Chat API (Warpio Integration)    │ │
│  │  - Session Management               │ │
│  └─────────────────────────────────────┘ │
└─────────────────┬───────────────────────┘
                  │ Uses
                  ▼
┌─────────────────────────────────────────┐
│         Warpio Core                     │
│  ┌─────────────────────────────────────┐ │
│  │  - GeminiChat                       │ │
│  │  - PersonaManager                   │ │
│  │  - File Tools                       │ │
│  │  - Shell Tools                      │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout  
- `GET /api/auth/me` - Get current user info

### File Operations
- `GET /api/files/ls?path=<path>` - List directory contents
- `GET /api/files/read?path=<path>` - Read file contents
- `POST /api/files/write` - Write file contents
- `POST /api/files/upload` - Upload files
- `DELETE /api/files/delete?path=<path>` - Delete files/directories

### Chat
- `POST /api/chat/message` - Send message to Warpio
- `GET /api/chat/history` - Get chat history
- `DELETE /api/chat/history` - Clear chat history
- `GET /api/chat/personas` - Get available personas

## User Management

### Default User
- **Username**: `warpio`
- **Password**: `warpio123`
- **Working Directory**: Current directory where server starts

### Creating Additional Users

Users are stored in `~/.warpio/web-server/users.json`. You can create additional users via the API:

```bash
curl -X POST http://localhost:3001/api/auth/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "username": "newuser",
    "password": "password123",
    "workingDirectory": "/path/to/user/workspace"
  }'
```

## Security Features

- **Authentication**: JWT-based authentication with secure sessions
- **File Access Control**: Users restricted to their working directory
- **Input Validation**: All file paths and inputs are validated
- **HTTPS Ready**: Helmet.js security headers and HTTPS support
- **Rate Limiting**: API rate limiting to prevent abuse

## Development

### File Structure

```
packages/
├── web-server/          # Express.js backend
│   ├── src/
│   │   ├── auth/        # Authentication logic
│   │   ├── routes/      # API routes
│   │   ├── chat/        # Chat integration
│   │   └── server.ts    # Main server
│   └── package.json
└── frontend/            # React frontend
    ├── src/
    │   ├── components/  # React components
    │   ├── services/    # API services
    │   ├── contexts/    # React contexts
    │   └── pages/       # Page components
    └── package.json
```

### Development Commands

```bash
# Install dependencies
npm install

# Development mode (both server and frontend with hot reload)
npm run dev:web

# Build for production
npm run build:web

# Run just the backend
npm run dev --workspace=packages/web-server

# Run just the frontend
npm run dev --workspace=packages/frontend
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Your Gemini API key | Required |
| `WARPIO_JWT_SECRET` | JWT signing secret | `warpio-default-secret-change-in-production` |
| `WARPIO_SESSION_SECRET` | Express session secret | `warpio-session-secret-change-in-production` |
| `PORT` | Web server port | `3001` |
| `NODE_ENV` | Environment mode | `development` |

## Production Deployment

### 1. Build the Application

```bash
npm run build:web
```

### 2. Set Production Environment Variables

```bash
export NODE_ENV=production
export WARPIO_JWT_SECRET="your-secure-jwt-secret"
export WARPIO_SESSION_SECRET="your-secure-session-secret"
export GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Start the Server

```bash
npm run start --workspace=packages/web-server
```

### 4. Serve Frontend (Optional)

The web server serves the built frontend automatically. For high-traffic deployments, consider using a reverse proxy like nginx.

## Troubleshooting

### Common Issues

1. **"Failed to load file"**: Check file permissions and working directory
2. **Authentication errors**: Verify JWT_SECRET is consistent across restarts
3. **Chat not working**: Ensure GEMINI_API_KEY is set correctly
4. **File upload fails**: Check disk space and upload directory permissions

### Debugging

Enable debug logging:

```bash
export DEBUG=warpio:*
npm run dev:web
```

### Logs

- Server logs: Console output from Express server
- Chat sessions: Stored in `~/.warpio/web-server/chats/`
- User data: Stored in `~/.warpio/web-server/users.json`

## Integration with Warpio CLI

The web interface uses the same core Warpio components:

- **PersonaManager**: Access to all Warpio personas
- **GeminiChat**: Same chat engine as CLI
- **File Tools**: Same file operations as CLI
- **MCP Integration**: Future support for IOWarp MCPs

This ensures feature parity between web and CLI interfaces.