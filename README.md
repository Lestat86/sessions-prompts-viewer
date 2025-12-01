# Prompt Session Viewer

A web application to browse and visualize your AI coding assistant conversation history. Supports multiple CLI tools. Built with Next.js and TypeScript.

## Supported Tools

| Tool | Directory | Status |
|------|-----------|--------|
| **Claude Code** | `~/.claude/projects/` | Supported |
| **Codex** (OpenAI) | `~/.codex/sessions/` | Supported |
| **Code** (just-every) | `~/.code/sessions/` | Supported |
| **OpenCode** | `~/.local/share/opencode/storage/` | Supported |

## Features

- **Multi-Provider Support**: Switch between different AI coding tools with bottom tab navigation
- **Projects List**: View all projects organized by working directory
- **Sessions Browser**: Browse all conversation sessions for each project
- **Chat View**: Visualize conversations in a chat-style interface
  - Assistant messages on the left, User messages on the right
  - Collapsible messages (accordion style)
  - Expandable "Thinking" blocks (Claude's reasoning)
  - Expandable "Tool Calls" (commands executed)
  - Tool Results display with syntax highlighting

## How It Works

Each supported tool stores conversation sessions locally in different formats. This app reads those files directly using Next.js Server Components, providing a unified interface to review past conversations.

### Data Locations

```
~/.claude/
├── projects/                          # Claude Code: by project
│   └── -home-user-myproject/
│       └── {uuid}.jsonl

~/.codex/
├── sessions/                          # Codex: by date
│   └── 2025/11/26/
│       └── rollout-{timestamp}-{uuid}.jsonl

~/.code/
├── sessions/                          # Code: by date
│   └── 2025/10/31/
│       └── rollout-{timestamp}-{uuid}.jsonl

~/.local/share/opencode/
├── storage/                           # OpenCode: JSON files
│   ├── project/{hash}.json
│   ├── session/{projectId}/{sessionId}.json
│   ├── message/{sessionId}/{msgId}.json
│   └── part/{msgId}/{partId}.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- At least one supported CLI tool installed with existing conversation history

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

### Install as System Service (Linux)

Run the app automatically at system startup using systemd:

```bash
# Install and start the service (default port: 8383)
./scripts/install.sh

# Or specify a custom port
./scripts/install.sh 8080
```

The installer will:
- Build the application
- Create a systemd user service
- Enable autostart at login
- Start the service immediately
- Configure local hostname `session-viewer.local` (requires sudo)

**Access the app:**
- http://localhost:8383
- http://session-viewer.local:8383

**Service Management:**

```bash
# Check status
systemctl --user status prompt-session-viewer

# Stop/Start/Restart
systemctl --user stop prompt-session-viewer
systemctl --user start prompt-session-viewer
systemctl --user restart prompt-session-viewer

# View logs
journalctl --user -u prompt-session-viewer -f

# Uninstall
./scripts/uninstall.sh
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                              # Redirect to default provider
│   └── [provider]/
│       ├── page.tsx                          # Projects list
│       └── project/
│           └── [projectId]/
│               ├── page.tsx                  # Sessions list
│               └── session/
│                   └── [sessionId]/
│                       ├── page.tsx          # Chat view (server)
│                       └── ProviderChatView.tsx
├── components/
│   ├── ProviderTabs.tsx                      # Bottom navigation tabs
│   └── ProviderChatMessage.tsx               # Message component
├── lib/
│   └── providers/
│       ├── index.ts                          # Provider registry
│       ├── claude-provider.ts                # Claude Code implementation
│       ├── codex-provider.ts                 # Codex & Code implementation
│       └── opencode-provider.ts              # OpenCode implementation
└── types/
    ├── claude.ts                             # Claude-specific types
    └── providers.ts                          # Generic provider types
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Data**: Local filesystem (JSONL/JSON files)

## Adding New Providers

To add support for a new CLI tool:

1. Create a new provider in `src/lib/providers/`
2. Implement the `IProvider` interface from `src/types/providers.ts`
3. Register it in `src/lib/providers/index.ts`

## License

MIT
