# Warpio Net - Web Interface for Warpio CLI

Web-based interface for the Warpio AI CLI with terminal access, file management, and multi-user support.

## Features

- **Web Terminal**: Full Warpio CLI with MCP servers (arxiv, pandas, plot, compression, etc.)
- **File Manager**: Upload, browse, edit files with image preview
- **Multi-User**: Isolated workspaces with personal API keys
- **Real-time**: WebSocket terminal + auto-refresh file lists

## Quick Docker Deployment

```bash
# Clone repository
git clone https://github.com/username/warpio-net.git
cd warpio-net

# Build and start
docker build -t warpio-net .
docker run -d --name warpio-net -p 5015:5015 -v warpio-data:/app/data warpio-net

# Create admin user
docker exec warpio-net sh -c 'echo "[{\"username\":\"admin\",\"password\":\"your_secure_password\",\"workingDirectory\":\"/app/data/admin\",\"createdAt\":\"2024-01-01T00:00:00.000Z\"}]" > /app/data/users.json'
docker exec warpio-net mkdir -p /app/data/admin
docker restart warpio-net
```

**Access**: http://localhost:5015  
**Login**: admin / your_secure_password

## User Management

```bash
# Add new users (edit users.json in container)
docker exec -it warpio-net vi /app/data/users.json

# Example user entry:
{
  "username": "alice", 
  "password": "alice_password",
  "workingDirectory": "/app/data/alice",
  "geminiApiKey": "AIzaSyC_example_key_here", 
  "createdAt": "2024-01-01T00:00:00.000Z"
}

# Create user directory
docker exec warpio-net mkdir -p /app/data/alice
docker restart warpio-net
```

## Configuration

**Personal API Keys**: Each user should have their own Gemini API key in their user record for quota isolation.

**Fallback Key**: Set `GEMINI_API_KEY` environment variable as fallback for users without personal keys.

## Container Management

```bash
# View logs
docker logs warpio-net

# Update container
docker stop warpio-net
docker rm warpio-net
git pull
docker build -t warpio-net .
docker run -d --name warpio-net -p 5015:5015 -v warpio-data:/app/data warpio-net

# Backup user data
docker run --rm -v warpio-data:/data -v $(pwd):/backup busybox tar czf /backup/warpio-backup.tar.gz /data
```

## Deployment Options

- **Docker** (recommended): Zero-config containerized deployment
- **Manual**: See [MANUAL_DEPLOYMENT.md](MANUAL_DEPLOYMENT.md) for local installation

## Usage

1. **Terminal Tab**: Use Warpio naturally - "Help me analyze this CSV data"
2. **Files Tab**: Upload/browse files with image preview
3. **Shell Commands**: Use `!ls`, `!pwd` etc. from within Warpio

**Available MCP Servers**: arxiv, pandas, plot, compression, adios, node-hardware

---

**License**: MIT | **Issues**: [GitHub Issues](https://github.com/username/warpio-net/issues)