# Manual Deployment Guide

This guide covers manual installation of Warpio Net without Docker.

## Prerequisites

- Node.js 18+ with npm
- Python 3.8+ with pip/uv package manager
- Git
- Build tools (gcc, g++, make, python3-dev)

## Installation Steps

### 1. Install System Dependencies

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y nodejs npm python3 python3-dev python3-pip build-essential git curl
```

**CentOS/RHEL:**
```bash
sudo yum install -y nodejs npm python3 python3-devel gcc gcc-c++ make git curl
```

### 2. Install Python uv Package Manager

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc  # or restart terminal
```

### 3. Install Warpio CLI

```bash
git clone https://github.com/JaimeCernuda/warpio-cli.git
cd warpio-cli
npm install
npm run build
sudo npm link  # Makes 'warpio' globally available
cd ..
```

### 4. Install Warpio Net

```bash
git clone https://github.com/username/warpio-net.git
cd warpio-net

# Install dependencies
npm ci
npm run build

# Install backend dependencies
cd packages/web-terminal
npm ci
cd ../..

# Build frontend
cd packages/terminal-frontend
npm ci
npm run build
cd ../..
```

### 5. Configure Environment

```bash
# Create environment file
cp .env.example .env

# Edit with your settings
nano .env
```

**Required Environment Variables:**
```bash
GEMINI_API_KEY=AIzaSyC_your_fallback_api_key_here
PORT=5015
WARPIO_SESSION_SECRET=your_random_session_secret_here
```

### 6. Setup User Data Directory

```bash
# Create data directory
mkdir -p data/admin

# Create initial admin user
echo '[{
  "username": "admin",
  "password": "your_secure_password", 
  "workingDirectory": "/full/path/to/data/admin",
  "geminiApiKey": "AIzaSyC_admin_personal_key",
  "createdAt": "2024-01-01T00:00:00.000Z"
}]' > data/users.json

# Copy Warpio config files
cp -r ~/.warpio data/admin/.warpio 2>/dev/null || echo "No existing .warpio config found"
```

### 7. Install MCP Servers

```bash
# Install common MCP servers globally
uvx install iowarp-mcps[pandas]
uvx install iowarp-mcps[arxiv] 
uvx install iowarp-mcps[compression]
uvx install iowarp-mcps[plot]
uvx install iowarp-mcps[adios]
uvx install iowarp-mcps[node-hardware]

# Verify installations
uvx list
```

### 8. Start the Server

```bash
cd packages/web-terminal
npm run start
```

**Or with PM2 (production):**
```bash
npm install -g pm2
cd packages/web-terminal
pm2 start src/index.ts --name warpio-net --interpreter tsx
pm2 save
pm2 startup  # Follow instructions to auto-start
```

## Access & Usage

- **URL**: http://localhost:5015
- **Login**: admin / your_secure_password

## User Management

### Add New Users

Edit `data/users.json`:
```json
[
  {
    "username": "admin",
    "password": "admin_password",
    "workingDirectory": "/full/path/to/data/admin",
    "geminiApiKey": "AIzaSyC_admin_key", 
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "username": "alice",
    "password": "alice_password",
    "workingDirectory": "/full/path/to/data/alice",
    "geminiApiKey": "AIzaSyC_alice_key",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

Create user directories:
```bash
mkdir -p data/alice
cp -r data/admin/.warpio data/alice/.warpio  # Copy Warpio config
chown -R alice:alice data/alice  # Set permissions
```

### Change Passwords

Edit `data/users.json` and update the `password` field with the new plaintext password. The server will hash it on next startup.

## Production Configuration

### Reverse Proxy (nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5015;
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

### SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp  
sudo ufw enable

# iptables
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT  
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

## Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   lsof -i :5015
   kill $(lsof -t -i :5015)
   ```

2. **Permission errors**:
   ```bash
   sudo chown -R $USER:$USER data/
   chmod 755 data/
   ```

3. **MCP servers not found**:
   ```bash
   which uvx
   uvx list
   export PATH=$PATH:~/.local/bin
   ```

4. **Node.js version issues**:
   ```bash
   curl -fsSL https://fnm.vercel.app/install | bash
   source ~/.bashrc
   fnm install 20
   fnm use 20
   ```

### Log Files

```bash
# Application logs (if using PM2)
pm2 logs warpio-net

# System logs
sudo journalctl -u nginx
sudo tail -f /var/log/nginx/error.log
```

### Backup & Restore

```bash
# Backup user data
tar czf warpio-backup-$(date +%Y%m%d).tar.gz data/

# Restore
tar xzf warpio-backup-20240101.tar.gz
```

## Development Mode

For development, run frontend and backend separately:

```bash
# Terminal 1: Backend
cd packages/web-terminal
npm run dev

# Terminal 2: Frontend  
cd packages/terminal-frontend
npm run dev
```

Frontend dev server: http://localhost:3000  
Backend API server: http://localhost:5015

---

**For Docker deployment (recommended)**, see main [README.md](README.md).