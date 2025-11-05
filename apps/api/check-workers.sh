#!/bin/bash

# Quick diagnostic script to check if workers are running correctly

echo "=== Checking Worker Containers ==="
echo ""

echo "1. Container Status:"
docker ps --filter "name=api" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
echo ""

echo "2. Checking what command each container is running:"
echo ""
echo "API Server:"
docker inspect api-api-server-1 --format '{{.Config.Cmd}}' 2>/dev/null || echo "Container not found"
docker inspect api-api-server-1 --format '{{range .Config.Env}}{{println .}}{{end}}' | grep CMD_OVERRIDE 2>/dev/null || echo "No CMD_OVERRIDE found"
echo ""

echo "Rasterize Worker:"
docker inspect api-rasterize-worker-1 --format '{{.Config.Cmd}}' 2>/dev/null || echo "Container not found"
docker inspect api-rasterize-worker-1 --format '{{range .Config.Env}}{{println .}}{{end}}' | grep CMD_OVERRIDE 2>/dev/null || echo "No CMD_OVERRIDE found"
echo ""

echo "LLM Worker:"
docker inspect api-llm-worker-1 --format '{{.Config.Cmd}}' 2>/dev/null || echo "Container not found"
docker inspect api-llm-worker-1 --format '{{range .Config.Env}}{{println .}}{{end}}' | grep CMD_OVERRIDE 2>/dev/null || echo "No CMD_OVERRIDE found"
echo ""

echo "3. Worker Logs (last 10 lines):"
echo ""
echo "--- Rasterize Worker ---"
docker logs api-rasterize-worker-1 --tail 10 2>&1 || echo "No logs"
echo ""
echo "--- LLM Worker ---"
docker logs api-llm-worker-1 --tail 10 2>&1 || echo "No logs"
echo ""

echo "4. Testing if workers can execute their commands:"
echo ""
echo "Testing rasterize worker command:"
docker exec api-rasterize-worker-1 sh -c 'echo $CMD_OVERRIDE' 2>/dev/null || echo "Cannot execute"
echo ""
echo "Testing LLM worker command:"
docker exec api-llm-worker-1 sh -c 'echo $CMD_OVERRIDE' 2>/dev/null || echo "Cannot execute"

