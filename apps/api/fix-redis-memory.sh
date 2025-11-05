#!/bin/bash

# Script to fix Redis memory overcommit warning on EC2
# This script sets vm.overcommit_memory = 1 permanently

set -e

echo "=========================================="
echo "Fixing Redis Memory Overcommit Warning"
echo "=========================================="
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "This script needs to be run with sudo privileges"
    echo "Usage: sudo ./fix-redis-memory.sh"
    exit 1
fi

echo "Step 1: Setting vm.overcommit_memory = 1 temporarily..."
sysctl vm.overcommit_memory=1
echo "✓ Temporary setting applied"
echo ""

echo "Step 2: Making the change permanent..."
# Check if the setting already exists in sysctl.conf
if grep -q "vm.overcommit_memory" /etc/sysctl.conf; then
    echo "  Found existing vm.overcommit_memory setting, updating it..."
    sed -i 's/^.*vm.overcommit_memory.*$/vm.overcommit_memory = 1/' /etc/sysctl.conf
else
    echo "  Adding vm.overcommit_memory = 1 to /etc/sysctl.conf..."
    echo "" >> /etc/sysctl.conf
    echo "# Redis recommendation: Enable memory overcommit" >> /etc/sysctl.conf
    echo "vm.overcommit_memory = 1" >> /etc/sysctl.conf
fi
echo "✓ Permanent setting saved"
echo ""

echo "Step 3: Verifying the setting..."
CURRENT_VALUE=$(sysctl -n vm.overcommit_memory)
if [ "$CURRENT_VALUE" = "1" ]; then
    echo "✓ Verification successful: vm.overcommit_memory = $CURRENT_VALUE"
else
    echo "✗ Warning: Current value is $CURRENT_VALUE (expected 1)"
fi
echo ""

echo "=========================================="
echo "Fix completed successfully!"
echo "=========================================="
echo ""
echo "The warning will disappear after Redis restarts."
echo "You can restart Redis with:"
echo "  docker-compose -f docker-compose.prod.yml restart redis"
echo ""
echo "Or restart all containers:"
echo "  docker-compose -f docker-compose.prod.yml restart"

