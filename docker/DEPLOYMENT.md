# Warpio Net - Docker Deployment Guide

Complete Docker deployment guide for Warpio Net web interface.

## Quick Start

### Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+
- Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 1. Clone and Configure

```bash
git clone https://github.com/JaimeCernuda/warpio-net.git
cd warpio-net
```

### 2. Environment Setup

Create `.env` file:

```bash
# Required: Fallback Gemini API key (used when users don't have personal keys)
GEMINI_API_KEY=AIzaSyC_YOUR_FALLBACK_API_KEY_HERE

# Optional: Session secret (generate with openssl rand -hex 32)
WARPIO_SESSION_SECRET=your-secure-session-secret

# Optional: Host directory for user workspaces
WARPIO_WORKSPACES_DIR=./workspaces

# Optional: Specify MCP servers to use (comma-separated)
# If not set, all available MCP servers will be dynamically detected and installed
# WARPIO_MCP_SERVERS=adios-mcp,ndp-mcp,pandas-mcp
```

### 3. Start Services

```bash
# Development mode (basic setup)
docker-compose up -d

# Production mode (with nginx reverse proxy)
docker-compose --profile production up -d
```

### 4. Access Application

- **Development**: http://localhost:3003
- **Production**: http://localhost (port 80)

## Setup First User

Once the container is running, create your first admin user:

### Method 1: Using Docker Exec

```bash
# Access container shell
docker exec -it warpio-net bash

# Create first user
node scripts/manage-users.cjs setup admin yourpassword /workspaces/admin your-api-key
```

### Method 2: Using API Directly

```bash
# Check setup status
curl http://localhost:3003/api/auth/setup-status

# Create admin user with personal API key
curl -X POST http://localhost:3003/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "yourpassword",
    "workingDirectory": "/workspaces/admin",
    "geminiApiKey": "AIzaSyC_ADMIN_PERSONAL_API_KEY"
  }'
```

### Important: API Key Configuration

**The .env GEMINI_API_KEY is a fallback only** - each user should have their own personal API key for:
- **Quota isolation**: Users don't affect each other's quotas
- **Usage tracking**: Individual API usage monitoring  
- **Security**: Personal API keys stay with users

When creating users, always provide a personal `geminiApiKey`. The .env fallback is used only when a user doesn't have one set.

## Container Architecture

```
warpio-net/
├── Dockerfile              # Multi-stage production build
├── docker-compose.yml      # Service orchestration
├── .dockerignore           # Build context optimization
└── docker/
    ├── DEPLOYMENT.md        # This file
    ├── nginx/              # Reverse proxy config
    └── examples/           # Example configurations
```

## Configuration Options

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | ✅ | - | Google Gemini API key |
| `WARPIO_SESSION_SECRET` | ❌ | auto-generated | JWT session secret |
| `WARPIO_WORKSPACES_DIR` | ❌ | `./workspaces` | Host directory for user files |
| `WARPIO_MCP_SERVERS` | ❌ | auto-detect | Comma-separated list of MCP servers to use |
| `NODE_ENV` | ❌ | `production` | Node.js environment |
| `PORT` | ❌ | `3003` | Application port |

### Volume Mounts

```yaml
volumes:
  # Persistent user data (databases, configs)
  - warpio_data:/app/data
  
  # User workspace files (optional host mount)
  - ./workspaces:/workspaces
```

### MCP Server Management

Warpio Net now supports **dynamic MCP server installation** that automatically detects and installs available Model Context Protocol servers.

#### How it Works

1. **Dynamic Detection**: When a user connects to the terminal, the system automatically detects available MCP servers from warpio-cli
2. **On-Demand Installation**: MCP servers are installed dynamically using `uvx` when needed
3. **Progress Feedback**: Users see real-time installation progress in their terminal
4. **Flexible Configuration**: Override which MCP servers to use via environment variables

#### Configuration Options

**Automatic (Recommended)**:
```bash
# Let warpio automatically detect and install all available MCP servers
# No additional configuration needed
docker run -d -p 3003:5015 -e GEMINI_API_KEY=your_key warpio-net
```

**Manual Selection**:
```bash
# Specify only the MCP servers you want to use
docker run -d -p 3003:5015 \
  -e GEMINI_API_KEY=your_key \
  -e WARPIO_MCP_SERVERS="adios-mcp,ndp-mcp,pandas-mcp" \
  warpio-net
```

#### Available MCP Servers

Common MCP servers that will be automatically detected:
- `adios-mcp` - ADIOS scientific data format support
- `ndp-mcp` - Network Data Protocol integration
- `pandas-mcp` - Pandas data analysis tools
- `compression-mcp` - File compression utilities
- `arxiv-mcp` - ArXiv research paper access
- `plot-mcp` - Data visualization tools
- `lmod-mcp` - Environment module system
- `hdf5-mcp` - HDF5 scientific data format
- `node-hardware-mcp` - Hardware monitoring tools

#### Benefits

- **Future-Proof**: New MCP servers added to warpio-cli are automatically available
- **No Maintenance**: No need to update warpio-net when new MCP servers are released
- **Flexible**: Choose exactly which MCP servers you need for your use case
- **Fast Startup**: Only requested MCP servers are installed, reducing startup time

## Production Deployment

### With Nginx Reverse Proxy

```bash
# Start with production profile
docker-compose --profile production up -d
```

This includes:
- SSL termination (bring your own certificates)
- Static file serving
- Request forwarding to warpio-net container
- Health checks and monitoring

### SSL Setup

1. Place certificates in `docker/nginx/ssl/`:
   ```
   docker/nginx/ssl/
   ├── certificate.crt
   └── private.key
   ```

2. Update nginx configuration in `docker/nginx/nginx.conf`

### Custom Nginx Configuration

See `docker/nginx/nginx.conf` for the reverse proxy setup. Customize as needed for your domain and SSL requirements.

## Container Management

### Basic Operations

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f warpio-net

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up --build -d

# Remove all data (⚠️ destructive)
docker-compose down -v
```

### User Management

```bash
# List users
docker exec warpio-net node scripts/manage-users.cjs list admin yourpassword

# Create new user
docker exec warpio-net node scripts/manage-users.cjs create alice alice123 admin yourpassword /workspaces/alice

# Check setup status
docker exec warpio-net node scripts/manage-users.cjs status
```

### Monitoring

```bash
# Container health
docker ps
docker-compose ps

# Application health
curl http://localhost:3003/api/auth/setup-status

# Resource usage
docker stats warpio-net

# Container logs
docker logs warpio-net -f
```

## Development Mode

For development with hot reloading:

```bash
# Create development override
cat > docker-compose.override.yml << EOF
version: '3.8'
services:
  warpio-net:
    build:
      target: development
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: npm run dev
EOF

# Start in development mode
docker-compose up
```

## Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check logs
docker-compose logs warpio-net

# Verify environment
docker exec warpio-net env | grep GEMINI
```

**Can't create users:**
```bash
# Check container health
docker exec warpio-net curl -f http://localhost:3003/api/auth/setup-status

# Verify permissions
docker exec warpio-net ls -la /app/data
```

**Warpio CLI not working:**
```bash
# Check warpio installation
docker exec warpio-net warpio --version

# Test API key
docker exec warpio-net bash -c 'GEMINI_API_KEY=$GEMINI_API_KEY warpio -p "Hello"'
```

### Performance Tuning

**Memory limits:**
```yaml
services:
  warpio-net:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

**Log rotation:**
```yaml
services:
  warpio-net:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Backup and Recovery

### Backup User Data

```bash
# Create backup
docker run --rm \
  -v warpio-net_warpio_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/warpio-backup-$(date +%Y%m%d).tar.gz /data

# Backup workspaces
tar czf workspaces-backup-$(date +%Y%m%d).tar.gz workspaces/
```

### Restore Data

```bash
# Stop services
docker-compose down

# Restore data volume
docker run --rm \
  -v warpio-net_warpio_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/warpio-backup-YYYYMMDD.tar.gz -C /

# Restore workspaces
tar xzf workspaces-backup-YYYYMMDD.tar.gz

# Restart services
docker-compose up -d
```

## Security Considerations

1. **Change default secrets**: Always set `WARPIO_SESSION_SECRET`
2. **Use HTTPS in production**: Configure SSL certificates
3. **Limit network exposure**: Use firewall rules
4. **Regular updates**: Keep base images updated
5. **User isolation**: Each user has their own workspace directory
6. **API key security**: Use environment variables, never hardcode

## Scaling and High Availability

For multiple instances:

```yaml
services:
  warpio-net:
    deploy:
      replicas: 3
    volumes:
      # Use shared storage for user data
      - nfs-volume:/app/data
```

Use external load balancer (nginx, HAProxy, or cloud LB) for traffic distribution.

## Integration Examples

### With CI/CD

```yaml
# .github/workflows/deploy.yml
- name: Deploy Warpio Net
  run: |
    docker-compose pull
    docker-compose up -d --remove-orphans
```

### With Monitoring

```yaml
# Add to docker-compose.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    
  grafana:
    image: grafana/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## Support

- **Issues**: https://github.com/JaimeCernuda/warpio-net/issues
- **Documentation**: See main README.md for general usage
- **Docker Hub**: Images available at `warpionet/warpio-net` (if published)

---

**Quick Commands Summary:**

```bash
# Start
docker-compose up -d

# Setup first user
docker exec -it warpio-net node scripts/manage-users.cjs setup admin password

# View logs
docker-compose logs -f

# Stop
docker-compose down
```