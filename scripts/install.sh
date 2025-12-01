#!/bin/bash
set -e

# Prompt Session Viewer - Installation Script
# Installs as a systemd user service (no sudo required for basic install)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="prompt-session-viewer"
DEFAULT_PORT=8383
LOCAL_HOSTNAME="session-viewer.local"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Prompt Session Viewer - Installer${NC}"
echo -e "${GREEN}========================================${NC}"
echo

# Parse arguments
PORT=${1:-$DEFAULT_PORT}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ required (found v$NODE_VERSION)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) found${NC}"

# Install dependencies
echo
echo -e "${YELLOW}Installing dependencies...${NC}"
cd "$PROJECT_DIR"
npm install --production=false

# Build the application
echo
echo -e "${YELLOW}Building application...${NC}"
npm run build

# Create systemd user directory
SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
mkdir -p "$SYSTEMD_USER_DIR"

# Generate service file with correct paths
echo
echo -e "${YELLOW}Creating systemd service...${NC}"

SERVICE_FILE="$SYSTEMD_USER_DIR/${SERVICE_NAME}.service"

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Prompt Session Viewer - AI Coding Assistant Session Browser
After=network.target

[Service]
Type=simple
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/node $PROJECT_DIR/node_modules/.bin/next start -p $PORT
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=$PORT

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=prompt-session-viewer

[Install]
WantedBy=default.target
EOF

echo -e "${GREEN}✓ Service file created at $SERVICE_FILE${NC}"

# Reload systemd and enable service
echo
echo -e "${YELLOW}Enabling service...${NC}"
systemctl --user daemon-reload
systemctl --user enable "$SERVICE_NAME"

# Start the service
echo
echo -e "${YELLOW}Starting service...${NC}"
systemctl --user start "$SERVICE_NAME"

# Enable lingering (allows service to run even when user is not logged in)
echo
echo -e "${YELLOW}Enabling user lingering (service runs at boot)...${NC}"
loginctl enable-linger "$USER" 2>/dev/null || true

# Configure local hostname
echo
echo -e "${YELLOW}Configuring local hostname...${NC}"

HOSTS_ENTRY="127.0.0.1 $LOCAL_HOSTNAME"
if grep -q "$LOCAL_HOSTNAME" /etc/hosts 2>/dev/null; then
    echo -e "${GREEN}✓ Hostname $LOCAL_HOSTNAME already configured${NC}"
else
    echo -e "Adding ${GREEN}$LOCAL_HOSTNAME${NC} to /etc/hosts (requires sudo)..."
    if sudo sh -c "echo '$HOSTS_ENTRY' >> /etc/hosts"; then
        echo -e "${GREEN}✓ Hostname configured${NC}"
    else
        echo -e "${YELLOW}⚠ Could not add hostname. Add manually:${NC}"
        echo -e "  sudo sh -c \"echo '$HOSTS_ENTRY' >> /etc/hosts\""
    fi
fi

# Check status
sleep 2
if systemctl --user is-active --quiet "$SERVICE_NAME"; then
    echo
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Installation complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo
    echo -e "Service is running at:"
    echo -e "  ${GREEN}http://localhost:$PORT${NC}"
    echo -e "  ${GREEN}http://$LOCAL_HOSTNAME:$PORT${NC}"
    echo
    echo -e "Useful commands:"
    echo -e "  ${YELLOW}systemctl --user status $SERVICE_NAME${NC}  - Check status"
    echo -e "  ${YELLOW}systemctl --user stop $SERVICE_NAME${NC}    - Stop service"
    echo -e "  ${YELLOW}systemctl --user start $SERVICE_NAME${NC}   - Start service"
    echo -e "  ${YELLOW}systemctl --user restart $SERVICE_NAME${NC} - Restart service"
    echo -e "  ${YELLOW}journalctl --user -u $SERVICE_NAME -f${NC}  - View logs"
    echo
else
    echo -e "${RED}Warning: Service may not have started correctly${NC}"
    echo -e "Check status with: systemctl --user status $SERVICE_NAME"
    exit 1
fi
