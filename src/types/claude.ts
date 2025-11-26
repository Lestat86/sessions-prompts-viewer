// Types for Claude Code session data

export interface ClaudeProject {
  id: string; // encoded path
  path: string; // original path (decoded)
  name: string; // project name (last part of path)
  sessionsCount: number;
  lastModified: Date;
}

export interface ClaudeSession {
  id: string; // UUID
  projectId: string;
  title?: string;
  firstMessage?: string;
  messageCount: number;
  createdAt: Date;
  lastModified: Date;
}

export interface ThinkingContent {
  type: "thinking";
  thinking: string;
  signature?: string;
}

export interface TextContent {
  type: "text";
  text: string;
}

export interface ToolUseContent {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultContent {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export type MessageContent = ThinkingContent | TextContent | ToolUseContent | ToolResultContent;

export interface UserMessage {
  role: "user";
  content: string | ToolResultContent[];
}

export interface AssistantMessage {
  role: "assistant";
  content: MessageContent[];
  model?: string;
  id?: string;
  stop_reason?: string | null;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

export interface SessionEntry {
  type: "user" | "assistant" | "file-history-snapshot";
  uuid: string;
  parentUuid: string | null;
  timestamp: string;
  sessionId: string;
  message?: UserMessage | AssistantMessage;
  cwd?: string;
  version?: string;
  gitBranch?: string;
  requestId?: string;
  isSidechain?: boolean;
  userType?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  timestamp: Date;
  content: string | MessageContent[];
  thinking?: string;
  toolCalls?: ToolUseContent[];
  toolResults?: ToolResultContent[];
}
