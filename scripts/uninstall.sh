#!/bin/bash
set -e

# Prompt Session Viewer - Uninstallation Script

SERVICE_NAME="prompt-session-viewer"
SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
SERVICE_FILE="$SYSTEMD_USER_DIR/${SERVICE_NAME}.service"
LOCAL_HOSTNAME="session-viewer.local"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  Prompt Session Viewer - Uninstaller${NC}"
echo -e "${YELLOW}========================================${NC}"
echo

# Check if service exists
if [ ! -f "$SERVICE_FILE" ]; then
    echo -e "${YELLOW}Service is not installed${NC}"
else
    # Stop the service
    echo -e "${YELLOW}Stopping service...${NC}"
    systemctl --user stop "$SERVICE_NAME" 2>/dev/null || true

    # Disable the service
    echo -e "${YELLOW}Disabling service...${NC}"
    systemctl --user disable "$SERVICE_NAME" 2>/dev/null || true

    # Remove service file
    echo -e "${YELLOW}Removing service file...${NC}"
    rm -f "$SERVICE_FILE"

    # Reload systemd
    systemctl --user daemon-reload

    echo -e "${GREEN}✓ Service removed${NC}"
fi

# Remove hostname from /etc/hosts
echo
echo -e "${YELLOW}Removing local hostname...${NC}"
if grep -q "$LOCAL_HOSTNAME" /etc/hosts 2>/dev/null; then
    echo -e "Removing ${GREEN}$LOCAL_HOSTNAME${NC} from /etc/hosts (requires sudo)..."
    if sudo sed -i "/$LOCAL_HOSTNAME/d" /etc/hosts; then
        echo -e "${GREEN}✓ Hostname removed${NC}"
    else
        echo -e "${YELLOW}⚠ Could not remove hostname. Remove manually:${NC}"
        echo -e "  sudo sed -i '/$LOCAL_HOSTNAME/d' /etc/hosts"
    fi
else
    echo -e "${GREEN}✓ Hostname not in /etc/hosts${NC}"
fi

echo
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Uninstallation complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo
echo -e "The service has been removed."
echo -e "Project files in $(dirname "$(dirname "$0")") were ${YELLOW}not${NC} deleted."
echo
