// Provider abstraction types

export type ProviderId = "claude" | "codex" | "code" | "opencode";

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  description: string;
  icon: string;
  baseDir: string;
  available: boolean;
}

export interface ProviderProject {
  id: string;
  providerId: ProviderId;
  name: string;
  path: string;
  sessionsCount: number;
  lastModified: Date;
}

export interface ProviderSession {
  id: string;
  providerId: ProviderId;
  projectId: string;
  title?: string;
  firstMessage?: string;
  messageCount: number;
  cwd?: string;
  model?: string;
  gitBranch?: string;
  createdAt: Date;
  lastModified: Date;
}

export interface ProviderMessage {
  id: string;
  role: "user" | "assistant" | "system";
  timestamp: Date;
  content: string;
  thinking?: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  metadata?: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  content: string;
  isError?: boolean;
}

// Provider interface that each provider must implement
export interface IProvider {
  id: ProviderId;
  name: string;
  description: string;
  icon: string;

  isAvailable(): Promise<boolean>;
  getProjects(): Promise<ProviderProject[]>;
  getSessions(projectId: string): Promise<ProviderSession[]>;
  getMessages(projectId: string, sessionId: string): Promise<ProviderMessage[]>;
}
