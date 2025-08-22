#!/bin/bash
# Warpio Net Docker Startup Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    log_info "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    log_error "Docker Compose is not available. Please install Docker Compose."
    log_info "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

# Determine compose command
COMPOSE_CMD="docker-compose"
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
fi

# Change to script directory
cd "$(dirname "$0")/.."

log_info "Starting Warpio Net deployment..."

# Check for .env file
if [ ! -f .env ]; then
    log_warning ".env file not found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        log_warning "Please edit .env file with your GEMINI_API_KEY before continuing."
        log_info "Press Enter after editing .env file, or Ctrl+C to abort..."
        read
    else
        log_error ".env.example not found. Please create .env manually."
        exit 1
    fi
fi

# Check if GEMINI_API_KEY is set
if ! grep -q "^GEMINI_API_KEY=AIzaSyC_" .env; then
    log_warning "GEMINI_API_KEY not properly set in .env file."
    log_info "Please edit .env file with your actual API key."
    log_info "Get your key from: https://aistudio.google.com/app/apikey"
    exit 1
fi

# Create workspaces directory
mkdir -p workspaces
log_info "Created workspaces directory for user files."

# Pull/build and start services
log_info "Building and starting services..."
$COMPOSE_CMD up -d --build

# Wait for services to be healthy
log_info "Waiting for services to start..."
sleep 10

# Check if container is running
if ! docker ps | grep -q warpio-net; then
    log_error "Warpio Net container failed to start."
    log_info "Check logs with: $COMPOSE_CMD logs warpio-net"
    exit 1
fi

# Test if application is responding
if curl -s -f http://localhost:3003/api/auth/setup-status > /dev/null; then
    log_success "Warpio Net is running successfully!"
    log_info "Access the application at: http://localhost:3003"
    
    # Check if users exist
    SETUP_STATUS=$(curl -s http://localhost:3003/api/auth/setup-status)
    if echo "$SETUP_STATUS" | grep -q '"needsSetup":true'; then
        log_warning "No users configured yet."
        log_info "Create your first user with:"
        echo "  docker exec -it warpio-net node scripts/manage-users.cjs setup admin yourpassword"
        log_info "Or use the API directly - see docker/DEPLOYMENT.md for details."
    else
        log_success "Users already configured. You can login at http://localhost:3003"
    fi
else
    log_error "Application is not responding. Check the logs:"
    echo "  $COMPOSE_CMD logs warpio-net"
fi

log_info "Deployment complete!"
log_info "Useful commands:"
echo "  View logs:     $COMPOSE_CMD logs -f warpio-net"
echo "  Stop services: $COMPOSE_CMD down"
echo "  Restart:       $COMPOSE_CMD restart warpio-net"
echo "  Shell access:  docker exec -it warpio-net bash"