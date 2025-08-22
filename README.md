# Warpio Net - Web Interface for Warpio CLI

A modern web-based interface for the Warpio CLI, providing terminal access and file management through a browser.

## Features

- **Web Terminal**: Full terminal emulator running actual Warpio CLI
- **File Management**: Browse, view, edit, and manage files through a web interface
- **User Authentication**: Secure JWT-based login system
- **Per-User Configuration**: Individual API keys and isolated workspaces
- **Real-time Communication**: WebSocket-based terminal I/O

## Architecture

```
warpio-net/
├── packages/
│   ├── web-terminal/         # Express server + Socket.IO
│   └── terminal-frontend/    # React frontend
├── scripts/
│   └── manage-users.cjs      # User management CLI
└── DEPLOYMENT.md             # Deployment instructions
```

## Quick Start

### Prerequisites

- Node.js 18+ 
- Warpio CLI installed globally: `npm install -g warpio-cli`
- Gemini API key from Google AI Studio

### Installation

```bash
git clone https://github.com/JaimeCernuda/warpio-net.git
cd warpio-net
npm run install-deps
npm run build
```

### Start Server

```bash
cd packages/web-terminal
GEMINI_API_KEY="your-api-key" PORT=3003 npm run dev
```

Server runs at: **http://localhost:3003**

### Create First User

```bash
# Check setup status
node scripts/manage-users.cjs status

# Create admin user
node scripts/manage-users.cjs setup admin yourpassword /home/admin your-api-key
```

## Usage

1. Open browser to http://localhost:3003
2. Login with your credentials
3. Use the sidebar to switch between:
   - **Terminal**: Full Warpio CLI access
   - **Files**: Browse and edit files

## User Management

### Create Additional Users

```bash
# Create new user (requires admin credentials)
node scripts/manage-users.cjs create alice alice123 admin adminpass /home/alice alice-api-key

# List all users
node scripts/manage-users.cjs list admin adminpass
```

### API Endpoints

- `POST /api/auth/setup` - Create first user
- `POST /api/auth/login` - User login
- `GET /api/auth/users` - List users (admin only)
- `POST /api/auth/users` - Create user (admin only)
- `GET /api/files/*` - File operations
- WebSocket on `/` - Terminal I/O

## Security Features

- JWT authentication with 24-hour expiration
- bcrypt password hashing
- Path validation (users restricted to home directory)
- CORS protection
- Rate limiting
- Session management

## Configuration

### Environment Variables

```bash
# Required: API key for Warpio CLI
export GEMINI_API_KEY="your-api-key"

# Optional: Custom port (default: 3003)
export PORT=3003

# Optional: Session secret
export WARPIO_SESSION_SECRET="your-session-secret"
```

### Per-User Settings

Each user has:
- **Username & Password**: Authentication credentials
- **Home Directory**: Isolated file workspace
- **API Key**: Personal Gemini quota (optional)

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed production setup instructions.

## Development

### Start Development Servers

```bash
# Terminal server (backend)
cd packages/web-terminal && npm run dev

# Frontend (in another terminal)
cd packages/terminal-frontend && npm run dev
```

### Build for Production

```bash
npm run build
```

## Troubleshooting

### Common Issues

- **Can't login**: Check user exists and credentials are correct
- **Terminal not working**: Ensure Warpio CLI is installed globally
- **File access denied**: Verify user has permissions for their home directory

### Debug Commands

```bash
# Check setup status
node scripts/manage-users.cjs status

# Test user login
node scripts/manage-users.cjs login username password

# Check if port is in use
lsof -i :3003
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Related Projects

- [warpio-cli](https://github.com/JaimeCernuda/warpio-cli) - The core Warpio CLI tool
