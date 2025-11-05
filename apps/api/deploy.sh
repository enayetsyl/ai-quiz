#!/bin/bash

# Deployment script for quiz-tuition API
# This script pulls code from GitHub, stops containers, removes images,
# rebuilds all images, and starts the containers

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
GIT_REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
API_DIR="$(cd "$(dirname "$0")" && pwd)"

# Image names
API_IMAGE="quiz-generation-api:latest"
RASTERIZE_IMAGE="quiz-generation-rasterize:latest"
LLM_IMAGE="quiz-generation-llm:latest"

# Function to print colored messages
print_step() {
    echo -e "${YELLOW}${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

# Check if docker and docker-compose are available
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed or not in PATH"
    exit 1
fi

# Use 'docker compose' if available, otherwise 'docker-compose'
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Starting deployment process...${NC}"
echo -e "${GREEN}========================================${NC}"

# Step 1: Pull latest code from GitHub
print_step "Step 1: Pulling latest code from GitHub..."
cd "$GIT_REPO_DIR"

# Check if we're in a git repository
if [ ! -d .git ]; then
    print_error "Not a git repository. Please run this script from the project root."
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Current branch: $CURRENT_BRANCH${NC}"

# Pull latest changes
git fetch origin
if git diff --quiet HEAD origin/$CURRENT_BRANCH; then
    echo -e "${YELLOW}No new changes to pull${NC}"
else
    git reset --hard origin/$CURRENT_BRANCH
    print_success "Code pulled successfully"
fi

# Step 2: Navigate to API directory
cd "$API_DIR"
print_success "Changed to API directory: $API_DIR"

# Check if docker-compose.prod.yml exists
if [ ! -f "$COMPOSE_FILE" ]; then
    print_error "$COMPOSE_FILE not found in $API_DIR"
    exit 1
fi

# Step 3: Stop and remove containers
print_step "Step 2: Stopping containers..."
if $DOCKER_COMPOSE -f "$COMPOSE_FILE" ps -q 2>/dev/null | grep -q .; then
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" down
    print_success "Containers stopped and removed"
else
    echo -e "${YELLOW}No running containers found${NC}"
fi

# Step 4: Remove old images
print_step "Step 3: Removing old images..."
IMAGES_TO_REMOVE=("$API_IMAGE" "$RASTERIZE_IMAGE" "$LLM_IMAGE")

for image in "${IMAGES_TO_REMOVE[@]}"; do
    if docker images -q "$image" 2>/dev/null | grep -q .; then
        echo -e "${YELLOW}Removing image: $image${NC}"
        docker rmi -f "$image" 2>/dev/null || true
    else
        echo -e "${YELLOW}Image not found: $image (skipping)${NC}"
    fi
done

# Also remove dangling images
echo -e "${YELLOW}Cleaning up dangling images...${NC}"
docker image prune -f > /dev/null 2>&1 || true
print_success "Old images removed"

# Step 5: Build new images
print_step "Step 4: Building new images..."

# Build API server image
echo -e "${YELLOW}Building $API_IMAGE...${NC}"
if docker build \
    -f Dockerfile \
    -t "$API_IMAGE" \
    --build-arg CMD_OVERRIDE="node dist/server.js" \
    . > /tmp/docker-build-api.log 2>&1; then
    print_success "$API_IMAGE built successfully"
else
    print_error "Failed to build $API_IMAGE. Check /tmp/docker-build-api.log for details"
    cat /tmp/docker-build-api.log
    exit 1
fi

# Build rasterize worker image
echo -e "${YELLOW}Building $RASTERIZE_IMAGE...${NC}"
if docker build \
    -f Dockerfile \
    -t "$RASTERIZE_IMAGE" \
    --build-arg CMD_OVERRIDE="node dist/jobs/rasterize.worker.js" \
    . > /tmp/docker-build-rasterize.log 2>&1; then
    print_success "$RASTERIZE_IMAGE built successfully"
else
    print_error "Failed to build $RASTERIZE_IMAGE. Check /tmp/docker-build-rasterize.log for details"
    cat /tmp/docker-build-rasterize.log
    exit 1
fi

# Build LLM worker image
echo -e "${YELLOW}Building $LLM_IMAGE...${NC}"
if docker build \
    -f Dockerfile \
    -t "$LLM_IMAGE" \
    --build-arg CMD_OVERRIDE="node dist/jobs/llm.worker.js" \
    . > /tmp/docker-build-llm.log 2>&1; then
    print_success "$LLM_IMAGE built successfully"
else
    print_error "Failed to build $LLM_IMAGE. Check /tmp/docker-build-llm.log for details"
    cat /tmp/docker-build-llm.log
    exit 1
fi

# Step 6: Start containers
print_step "Step 5: Starting containers..."
if $DOCKER_COMPOSE -f "$COMPOSE_FILE" up -d; then
    print_success "Containers started"
else
    print_error "Failed to start containers"
    exit 1
fi

# Step 7: Show running containers
print_step "Step 6: Checking container status..."
sleep 3
$DOCKER_COMPOSE -f "$COMPOSE_FILE" ps

# Show container logs (last 20 lines for better visibility)
echo ""
print_step "Recent logs from containers:"
$DOCKER_COMPOSE -f "$COMPOSE_FILE" logs --tail=20

# Show worker-specific logs to verify they're running correctly
echo ""
print_step "Checking worker containers status:"
echo -e "${YELLOW}Rasterize Worker logs:${NC}"
$DOCKER_COMPOSE -f "$COMPOSE_FILE" logs --tail=5 rasterize-worker 2>/dev/null || echo "No logs yet"
echo ""
echo -e "${YELLOW}LLM Worker logs:${NC}"
$DOCKER_COMPOSE -f "$COMPOSE_FILE" logs --tail=5 llm-worker 2>/dev/null || echo "No logs yet"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  View logs: $DOCKER_COMPOSE -f $COMPOSE_FILE logs -f"
echo -e "  Check status: $DOCKER_COMPOSE -f $COMPOSE_FILE ps"
echo -e "  Stop containers: $DOCKER_COMPOSE -f $COMPOSE_FILE down"

