# Claude Prompt Viewer

A web application to browse and visualize your AI coding assistant conversation history. Supports multiple CLI tools. Built with Next.js and TypeScript.

## Supported Tools

| Tool | Directory | Status |
|------|-----------|--------|
| **Claude Code** | `~/.claude/projects/` | Supported |
| **Codex** (OpenAI) | `~/.codex/sessions/` | Supported |
| **Code** (just-every) | `~/.code/sessions/` | Supported |

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
│       └── codex-provider.ts                 # Codex & Code implementation
└── types/
    ├── claude.ts                             # Claude-specific types
    └── providers.ts                          # Generic provider types
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Data**: Local filesystem (JSONL files)

## Adding New Providers

To add support for a new CLI tool:

1. Create a new provider in `src/lib/providers/`
2. Implement the `IProvider` interface from `src/types/providers.ts`
3. Register it in `src/lib/providers/index.ts`

## Limitations

- Read-only: This is a viewer, not an editor
- Local only: Reads from local directories on the machine running the server
- No authentication: Anyone with access to the server can view all sessions

## License

MIT
