import { promises as fs } from "fs";
import path from "path";
import os from "os";
import {
  IProvider,
  ProviderProject,
  ProviderSession,
  ProviderMessage,
  ToolCall,
  ToolResult,
} from "@/types/providers";

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const PROJECTS_DIR = path.join(CLAUDE_DIR, "projects");

interface ClaudeSessionEntry {
  type: "user" | "assistant" | "file-history-snapshot";
  uuid: string;
  parentUuid: string | null;
  timestamp: string;
  sessionId: string;
  message?: {
    role: string;
    content: string | ContentBlock[];
  };
  cwd?: string;
  version?: string;
  gitBranch?: string;
}

interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  name?: string;
  id?: string;
  input?: Record<string, unknown>;
  content?: string | ContentBlock[];
  is_error?: boolean;
  tool_use_id?: string;
}

function decodeProjectPath(encodedPath: string): string {
  return encodedPath.replace(/-/g, "/");
}

function getProjectName(projectPath: string): string {
  const parts = projectPath.split("/").filter(Boolean);
  return parts[parts.length - 1] || projectPath;
}

export const claudeProvider: IProvider = {
  id: "claude",
  name: "Claude Code",
  description: "Anthropic Claude Code CLI",
  icon: "C",

  async isAvailable(): Promise<boolean> {
    try {
      await fs.access(PROJECTS_DIR);
      return true;
    } catch {
      return false;
    }
  },

  async getProjects(): Promise<ProviderProject[]> {
    try {
      const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
      const projects: ProviderProject[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const projectDir = path.join(PROJECTS_DIR, entry.name);
          const sessions = await fs.readdir(projectDir);
          const jsonlFiles = sessions.filter(
            (f) => f.endsWith(".jsonl") && !f.startsWith("agent-")
          );

          if (jsonlFiles.length > 0) {
            const stats = await fs.stat(projectDir);
            const decodedPath = decodeProjectPath(entry.name);

            projects.push({
              id: entry.name,
              providerId: "claude",
              path: decodedPath,
              name: getProjectName(decodedPath),
              sessionsCount: jsonlFiles.length,
              lastModified: stats.mtime,
            });
          }
        }
      }

      return projects.sort(
        (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
      );
    } catch (error) {
      console.error("Error reading Claude projects:", error);
      return [];
    }
  },

  async getSessions(projectId: string): Promise<ProviderSession[]> {
    try {
      const projectDir = path.join(PROJECTS_DIR, projectId);
      const files = await fs.readdir(projectDir);
      const jsonlFiles = files.filter(
        (f) => f.endsWith(".jsonl") && !f.startsWith("agent-")
      );

      const sessions: ProviderSession[] = [];

      for (const file of jsonlFiles) {
        const sessionId = file.replace(".jsonl", "");
        const filePath = path.join(projectDir, file);
        const stats = await fs.stat(filePath);

        const content = await fs.readFile(filePath, "utf-8");
        const lines = content.split("\n").filter(Boolean);

        let firstUserMessage: string | undefined;
        let messageCount = 0;
        let createdAt: Date | undefined;
        let cwd: string | undefined;
        let gitBranch: string | undefined;

        for (const line of lines) {
          try {
            const entry: ClaudeSessionEntry = JSON.parse(line);

            if (entry.type === "user" || entry.type === "assistant") {
              messageCount++;

              if (!createdAt && entry.timestamp) {
                createdAt = new Date(entry.timestamp);
              }

              if (!cwd && entry.cwd) {
                cwd = entry.cwd;
              }

              if (!gitBranch && entry.gitBranch) {
                gitBranch = entry.gitBranch;
              }

              if (!firstUserMessage && entry.type === "user" && entry.message) {
                if (typeof entry.message.content === "string") {
                  firstUserMessage = entry.message.content.slice(0, 200);
                }
              }
            }
          } catch {
            // Skip invalid JSON
          }
        }

        sessions.push({
          id: sessionId,
          providerId: "claude",
          projectId,
          title:
            firstUserMessage?.split("\n")[0]?.slice(0, 100) || "Untitled Session",
          firstMessage: firstUserMessage,
          messageCount,
          cwd,
          gitBranch,
          createdAt: createdAt || stats.birthtime,
          lastModified: stats.mtime,
        });
      }

      return sessions.sort(
        (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
      );
    } catch (error) {
      console.error("Error reading Claude sessions:", error);
      return [];
    }
  },

  async getMessages(
    projectId: string,
    sessionId: string
  ): Promise<ProviderMessage[]> {
    try {
      const filePath = path.join(PROJECTS_DIR, projectId, `${sessionId}.jsonl`);
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n").filter(Boolean);

      const messages: ProviderMessage[] = [];
      const seenIds = new Set<string>();

      for (const line of lines) {
        try {
          const entry: ClaudeSessionEntry = JSON.parse(line);

          if (
            (entry.type === "user" || entry.type === "assistant") &&
            entry.message
          ) {
            if (seenIds.has(entry.uuid)) {
              // Update existing if more content
              const existingIdx = messages.findIndex((m) => m.id === entry.uuid);
              if (existingIdx >= 0 && entry.type === "assistant") {
                const newContent = entry.message.content;
                if (Array.isArray(newContent)) {
                  const existing = messages[existingIdx];
                  if (
                    Array.isArray(existing.content) &&
                    newContent.length > (existing.content as unknown[]).length
                  ) {
                    messages[existingIdx] = parseClaudeMessage(entry);
                  }
                }
              }
              continue;
            }

            seenIds.add(entry.uuid);
            messages.push(parseClaudeMessage(entry));
          }
        } catch {
          // Skip invalid JSON
        }
      }

      return messages;
    } catch (error) {
      console.error("Error reading Claude messages:", error);
      return [];
    }
  },
};

function parseClaudeMessage(entry: ClaudeSessionEntry): ProviderMessage {
  const message: ProviderMessage = {
    id: entry.uuid,
    role: entry.type as "user" | "assistant",
    timestamp: new Date(entry.timestamp),
    content: "",
  };

  if (!entry.message) return message;

  if (entry.type === "user") {
    if (typeof entry.message.content === "string") {
      message.content = entry.message.content;
    } else if (Array.isArray(entry.message.content)) {
      // Extract text content and tool results from user messages
      const textParts: string[] = [];
      const toolResults: ToolResult[] = [];

      for (const block of entry.message.content) {
        if (block.type === "text" && block.text) {
          textParts.push(block.text);
        } else if (block.type === "tool_result" && block.tool_use_id) {
          // tool_result content can be string or array of {type, text}
          let resultContent = "";
          if (typeof block.content === "string") {
            resultContent = block.content;
          } else if (Array.isArray(block.content)) {
            resultContent = block.content
              .filter((c: ContentBlock) => c.type === "text" && c.text)
              .map((c: ContentBlock) => c.text)
              .join("\n");
          }
          toolResults.push({
            toolCallId: block.tool_use_id,
            content: resultContent,
            isError: block.is_error,
          });
        }
      }

      if (textParts.length > 0) {
        message.content = textParts.join("\n\n");
      }
      if (toolResults.length > 0) {
        message.toolResults = toolResults;
      }
    }
  } else if (entry.type === "assistant") {
    if (Array.isArray(entry.message.content)) {
      // Extract text content
      const textParts: string[] = [];
      const toolCalls: ToolCall[] = [];

      for (const block of entry.message.content) {
        if (block.type === "text" && block.text) {
          textParts.push(block.text);
        } else if (block.type === "thinking" && block.thinking) {
          message.thinking = block.thinking;
        } else if (block.type === "tool_use" && block.name && block.id) {
          toolCalls.push({
            id: block.id,
            name: block.name,
            input: block.input || {},
          });
        }
      }

      message.content = textParts.join("\n\n");
      if (toolCalls.length > 0) {
        message.toolCalls = toolCalls;
      }
    }
  }

  return message;
}
