# Warpio Web Interface - Manual Deployment Guide

Step-by-step manual instructions for deploying the Warpio web interface from scratch.

## Prerequisites

- **Node.js** 18+ and npm installed
- **Warpio CLI** installed globally: `npm install -g warpio-cli`
- **Git** for cloning the repository
- **Gemini API Key** from Google AI Studio

## Step 1: Download and Install

```bash
git clone https://github.com/JaimeCernuda/warpio-net.git
cd warpio-net
```

Install dependencies manually:
```bash
npm install
cd packages/web-terminal
npm install
cd ../terminal-frontend
npm install
cd ../..
```

## Step 2: Build the Frontend

```bash
cd packages/terminal-frontend
npm run build
cd ../..
```

## Step 3: Start the Server

```bash
cd packages/web-terminal
GEMINI_API_KEY="AIzaSyC_YOUR_API_KEY" PORT=3003 npm run dev
```

Server will start at: **http://localhost:3003**

## Step 4: Create Your First User

### Method 1: Using the Management CLI

Check if setup is needed:
```bash
node scripts/manage-users.cjs status
```

Create the first admin user:
```bash
node scripts/manage-users.cjs setup admin mySecurePassword /home/admin AIzaSyC_YOUR_PERSONAL_API_KEY
```

### Method 2: Using Direct API Calls

Check setup status:
```bash
curl http://localhost:3003/api/auth/setup-status
```

Create first user via API:
```bash
curl -X POST http://localhost:3003/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "mySecurePassword",
    "workingDirectory": "/home/admin",
    "geminiApiKey": "AIzaSyC_YOUR_PERSONAL_API_KEY"
  }'
```

## Step 5: Access the Interface

1. Open browser to **http://localhost:3003**
2. Login with your created username/password
3. You'll see the terminal and file browser interface

## Creating Additional Users

Once you have an admin user, you can create more users:

### Method 1: Using the CLI Tool

```bash
# Create a new user (requires admin login)
node scripts/manage-users.cjs create alice alice123 admin myAdminPassword /home/alice AIzaSyC_ALICE_API_KEY
```

### Method 2: Using API Calls

First, login as admin to get a token:
```bash
TOKEN=$(curl -s -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"myAdminPassword"}' | jq -r '.token')
```

Then create the new user:
```bash
curl -X POST http://localhost:3003/api/auth/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "alice123",
    "workingDirectory": "/home/alice",
    "geminiApiKey": "AIzaSyC_ALICE_PERSONAL_KEY"
  }'
```

### List Users

```bash
# Using CLI
node scripts/manage-users.cjs list admin myAdminPassword

# Using API
curl -H "Authorization: Bearer $TOKEN" http://localhost:3003/api/auth/users
```

## Production Deployment

### Environment Variables

Create a `.env` file or set environment variables:

```bash
# Required: Default API key (fallback when users don't have personal keys)
export GEMINI_API_KEY="AIzaSyC_YOUR_DEFAULT_API_KEY"

# Optional: Custom port (default: 3003)
export PORT=3003

# Optional: Session secret (default: auto-generated)
export WARPIO_SESSION_SECRET="your-secure-session-secret"

# Optional: Production mode
export NODE_ENV=production
```

### Build for Production

```bash
# Build optimized frontend
cd packages/terminal-frontend
npm run build
cd ../..

# The terminal server will serve the built frontend automatically
```

### Start Production Server

```bash
cd packages/web-terminal
npm run build  # Build the server TypeScript
npm start       # Start production server
```

Or with PM2 for process management:
```bash
# Install PM2
npm install -g pm2

# Start with PM2
cd packages/web-terminal
pm2 start "npm start" --name "warpio-web"
pm2 save
pm2 startup
```

### Reverse Proxy Setup (Optional)

For production with custom domain, use nginx:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Architecture Overview

```
warpio-net/
├── packages/
│   ├── terminal-frontend/     # React frontend (builds to dist/)
│   │   ├── src/components/    # Terminal, FileManager, Sidebar
│   │   └── dist/             # Built frontend assets
│   └── web-terminal/         # Express server + Socket.IO
│       ├── src/              # Server code
│       └── dist/             # Built server
├── scripts/
│   └── manage-users.cjs      # User management CLI
└── DEPLOYMENT.md             # This file
```

## Port Information

- **Port 3003**: Complete integrated server
  - Web terminal interface
  - File management API
  - User authentication
  - WebSocket for terminal I/O

No other ports are needed - everything runs on 3003!

## Security Features

- **JWT Authentication**: 24-hour token expiration
- **Password Hashing**: bcrypt with salt rounds
- **Path Validation**: Users limited to their home directory
- **CORS Protection**: Configured origins
- **Rate Limiting**: API request limits
- **Session Management**: Secure cookie handling

## User Data Storage

User data is stored in: `~/.warpio/web-server/users.json`

Each user has:
- **Unique ID** and **username**
- **Encrypted password** (bcrypt)
- **Personal home directory** (sandboxed file access)
- **Optional API key** (personal Gemini quota)
- **Timestamps** (created, last login)

## Troubleshooting

### Server Won't Start
```bash
# Check if port is in use
lsof -i :3003

# Kill conflicting processes
kill $(lsof -ti:3003)
```

### Can't Create Users
```bash
# Check setup status
node scripts/manage-users.cjs status

# Verify admin credentials
node scripts/manage-users.cjs login admin yourpassword
```

### Terminal Not Working
- Ensure warpio CLI is installed globally: `npm install -g warpio-cli`
- Check API key is valid: `export GEMINI_API_KEY="your-key"`
- Verify user has valid API key or server has fallback key

### File Access Issues
- Verify user's home directory exists and is readable
- Check path permissions for the specified working directory
- Ensure user stays within their designated workspace

## API Endpoints

- `GET /api/auth/setup-status` - Check if setup is needed
- `POST /api/auth/setup` - Create first user (no auth required)
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/users` - List users (admin only)
- `POST /api/auth/users` - Create user (admin only)
- `GET /api/files/*` - File operations (authenticated)
- WebSocket on `/` for terminal I/O

## Next Steps

1. **Create your first admin user** with the setup command
2. **Start the server** and access http://localhost:3003
3. **Login** with your admin credentials
4. **Create additional users** for your team
5. **Enjoy the web-based warpio experience!**

Each user gets their own isolated terminal with personal API quota and file workspace. 🎉