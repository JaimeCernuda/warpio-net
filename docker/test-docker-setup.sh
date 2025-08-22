#!/bin/bash
# Docker Setup Validation Script
# Tests Docker configuration files without building

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Warpio Net Docker Setup Validation ===${NC}"

# Check required files exist
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} Missing: $1"
        exit 1
    fi
}

echo -e "\n${YELLOW}Checking Docker configuration files:${NC}"
check_file "Dockerfile"
check_file "docker-compose.yml"
check_file ".dockerignore"
check_file ".env.example"
check_file "docker/DEPLOYMENT.md"

echo -e "\n${YELLOW}Checking package.json scripts:${NC}"
if grep -q '"build":' packages/web-terminal/package.json; then
    echo -e "${GREEN}✓${NC} web-terminal build script"
else
    echo -e "${RED}✗${NC} Missing web-terminal build script"
    exit 1
fi

if grep -q '"start":' packages/web-terminal/package.json; then
    echo -e "${GREEN}✓${NC} web-terminal start script"
else
    echo -e "${RED}✗${NC} Missing web-terminal start script"
    exit 1
fi

if grep -q '"build":' packages/terminal-frontend/package.json; then
    echo -e "${GREEN}✓${NC} terminal-frontend build script"
else
    echo -e "${RED}✗${NC} Missing terminal-frontend build script"
    exit 1
fi

echo -e "\n${YELLOW}Validating Dockerfile syntax:${NC}"

# Basic Dockerfile validation
if grep -q "FROM node:18-alpine" Dockerfile; then
    echo -e "${GREEN}✓${NC} Using correct base image"
else
    echo -e "${RED}✗${NC} Invalid or missing base image"
    exit 1
fi

if grep -q "git clone.*warpio-cli" Dockerfile; then
    echo -e "${GREEN}✓${NC} Warpio CLI installation from git"
else
    echo -e "${RED}✗${NC} Missing warpio-cli git installation"
    exit 1
fi

if grep -q "HEALTHCHECK" Dockerfile; then
    echo -e "${GREEN}✓${NC} Health check configured"
else
    echo -e "${YELLOW}⚠${NC}  No health check in Dockerfile (but docker-compose has it)"
fi

echo -e "\n${YELLOW}Validating docker-compose.yml:${NC}"

if grep -q "warpio-net:" docker-compose.yml; then
    echo -e "${GREEN}✓${NC} Main service defined"
else
    echo -e "${RED}✗${NC} Missing main service"
    exit 1
fi

if grep -q "GEMINI_API_KEY" docker-compose.yml; then
    echo -e "${GREEN}✓${NC} Environment variables configured"
else
    echo -e "${RED}✗${NC} Missing environment variables"
    exit 1
fi

if grep -q "warpio_data:" docker-compose.yml; then
    echo -e "${GREEN}✓${NC} Persistent volumes configured"
else
    echo -e "${RED}✗${NC} Missing persistent volumes"
    exit 1
fi

if grep -q "healthcheck:" docker-compose.yml; then
    echo -e "${GREEN}✓${NC} Health checks configured"
else
    echo -e "${YELLOW}⚠${NC}  No health checks in docker-compose"
fi

echo -e "\n${YELLOW}Checking nginx configuration:${NC}"
if [ -f "docker/nginx/nginx.conf" ]; then
    echo -e "${GREEN}✓${NC} Nginx config exists"
    
    if grep -q "upstream warpio-net" docker/nginx/nginx.conf; then
        echo -e "${GREEN}✓${NC} Upstream configuration"
    else
        echo -e "${RED}✗${NC} Missing upstream configuration"
    fi
    
    if grep -q "socket.io" docker/nginx/nginx.conf; then
        echo -e "${GREEN}✓${NC} WebSocket support configured"
    else
        echo -e "${YELLOW}⚠${NC}  No WebSocket configuration found"
    fi
else
    echo -e "${YELLOW}⚠${NC}  Nginx config not found (optional)"
fi

echo -e "\n${YELLOW}Checking user management script:${NC}"
if [ -f "scripts/manage-users.cjs" ]; then
    echo -e "${GREEN}✓${NC} User management script exists"
    if grep -q "setup.*admin" scripts/manage-users.cjs; then
        echo -e "${GREEN}✓${NC} Setup command available"
    else
        echo -e "${RED}✗${NC} Setup command not found"
        exit 1
    fi
else
    echo -e "${RED}✗${NC} Missing user management script"
    exit 1
fi

echo -e "\n${YELLOW}Validating environment example:${NC}"
if grep -q "FALLBACK.*API.*KEY" .env.example; then
    echo -e "${GREEN}✓${NC} API key documentation is clear"
else
    echo -e "${YELLOW}⚠${NC}  API key documentation could be clearer"
fi

echo -e "\n${GREEN}=== All validations passed! ===${NC}"
echo -e "${GREEN}Docker setup appears to be correctly configured.${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Copy .env.example to .env and configure your fallback API key"
echo "2. Run: docker-compose up -d"
echo "3. Create first user with personal API key"
echo "4. Test the application at http://localhost:3003"

echo -e "\n${YELLOW}Note about testing:${NC}"
echo "This script only validates configuration files."
echo "For full testing, build and run the Docker containers."