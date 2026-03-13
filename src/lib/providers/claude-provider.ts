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

interface SessionsIndex {
  version: number;
  entries: SessionsIndexEntry[];
}

interface SessionsIndexEntry {
  sessionId: string;
  fullPath: string;
  fileMtime: number;
  firstPrompt?: string;
  summary?: string;
  messageCount: number;
  created: string;
  modified: string;
  gitBranch?: string;
  projectPath?: string;
  isSidechain?: boolean;
}

function decodeProjectPath(encodedPath: string): string {
  return encodedPath.replace(/-/g, "/");
}

function getProjectName(projectPath: string): string {
  const parts = projectPath.split("/").filter(Boolean);
  return parts[parts.length - 1] || projectPath;
}

async function readSessionsIndex(
  projectDir: string
): Promise<SessionsIndex | null> {
  try {
    const indexPath = path.join(projectDir, "sessions-index.json");
    const content = await fs.readFile(indexPath, "utf-8");
    return JSON.parse(content) as SessionsIndex;
  } catch {
    return null;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
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

          // Count sessions from both .jsonl files and sessions-index
          const files = await fs.readdir(projectDir);
          const jsonlFiles = files.filter(
            (f) => f.endsWith(".jsonl") && !f.startsWith("agent-")
          );

          const index = await readSessionsIndex(projectDir);
          const indexEntries = index?.entries?.filter((e) => !e.isSidechain) || [];

          // Merge: index entries + any .jsonl files not in the index
          const indexSessionIds = new Set(indexEntries.map((e) => e.sessionId));
          const extraJsonlFiles = jsonlFiles.filter(
            (f) => !indexSessionIds.has(f.replace(".jsonl", ""))
          );

          const totalSessions = indexEntries.length + extraJsonlFiles.length;

          if (totalSessions > 0) {
            const stats = await fs.stat(projectDir);
            const decodedPath = decodeProjectPath(entry.name);

            projects.push({
              id: entry.name,
              providerId: "claude",
              path: decodedPath,
              name: getProjectName(decodedPath),
              sessionsCount: totalSessions,
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
      const processedIds = new Set<string>();

      // 1. Read sessions-index.json for metadata (includes archived sessions)
      // Use index data directly - no need to read .jsonl files for listing
      const index = await readSessionsIndex(projectDir);
      if (index?.entries) {
        // Check which .jsonl files exist in bulk (one readdir, not per-entry stat)
        const existingJsonlSet = new Set(
          jsonlFiles.map((f) => f.replace(".jsonl", ""))
        );

        for (const entry of index.entries) {
          if (entry.isSidechain) continue;

          processedIds.add(entry.sessionId);
          const hasJsonl = existingJsonlSet.has(entry.sessionId);

          const firstUserMessage = entry.firstPrompt?.slice(0, 200);
          const title =
            entry.summary ||
            firstUserMessage?.split("\n")[0]?.slice(0, 100) ||
            "Untitled Session";

          sessions.push({
            id: entry.sessionId,
            providerId: "claude",
            projectId,
            title,
            summary: entry.summary,
            firstMessage: firstUserMessage,
            messageCount: entry.messageCount,
            gitBranch: entry.gitBranch,
            createdAt: new Date(entry.created),
            lastModified: new Date(entry.modified),
            isArchived: !hasJsonl,
          });
        }
      }

      // 2. Process any .jsonl files not in the index (legacy/orphaned)
      const orphanedFiles = jsonlFiles.filter(
        (f) => !processedIds.has(f.replace(".jsonl", ""))
      );

      const orphanedSessions = await Promise.all(
        orphanedFiles.map(async (file) => {
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
                if (!cwd && entry.cwd) cwd = entry.cwd;
                if (!gitBranch && entry.gitBranch) gitBranch = entry.gitBranch;
                if (
                  !firstUserMessage &&
                  entry.type === "user" &&
                  entry.message
                ) {
                  if (typeof entry.message.content === "string") {
                    firstUserMessage = entry.message.content.slice(0, 200);
                  }
                }
              }
            } catch {
              // skip
            }
          }

          return {
            id: sessionId,
            providerId: "claude" as const,
            projectId,
            title:
              firstUserMessage?.split("\n")[0]?.slice(0, 100) ||
              "Untitled Session",
            firstMessage: firstUserMessage,
            messageCount,
            cwd,
            gitBranch,
            createdAt: createdAt || stats.birthtime,
            lastModified: stats.mtime,
            isArchived: false,
          };
        })
      );

      sessions.push(...orphanedSessions);

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
      const filePath = path.join(
        PROJECTS_DIR,
        projectId,
        `${sessionId}.jsonl`
      );

      // Try to read the .jsonl file
      let content: string;
      try {
        content = await fs.readFile(filePath, "utf-8");
      } catch {
        // File doesn't exist - this is an archived session
        // Return a placeholder message with info from the index
        const index = await readSessionsIndex(
          path.join(PROJECTS_DIR, projectId)
        );
        const entry = index?.entries?.find((e) => e.sessionId === sessionId);

        const messages: ProviderMessage[] = [];

        if (entry) {
          // Show the first prompt as a user message
          if (entry.firstPrompt) {
            messages.push({
              id: `${sessionId}-first-prompt`,
              role: "user",
              timestamp: new Date(entry.created),
              content: entry.firstPrompt,
            });
          }

          // Show the summary as an assistant message
          if (entry.summary) {
            messages.push({
              id: `${sessionId}-summary`,
              role: "assistant",
              timestamp: new Date(entry.modified),
              content: `**Session Summary:** ${entry.summary}\n\n*This session has been archived by Claude Code. The full conversation (${entry.messageCount} messages) is no longer available on disk.*`,
            });
          }
        }

        if (messages.length === 0) {
          messages.push({
            id: `${sessionId}-archived`,
            role: "system",
            timestamp: new Date(),
            content:
              "This session has been archived by Claude Code. The conversation data is no longer available on disk.",
          });
        }

        return messages;
      }

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
              const existingIdx = messages.findIndex(
                (m) => m.id === entry.uuid
              );
              if (existingIdx >= 0 && entry.type === "assistant") {
                const newContent = entry.message.content;
                if (Array.isArray(newContent)) {
                  const existing = messages[existingIdx];
                  if (
                    Array.isArray(existing.content) &&
                    newContent.length >
                      (existing.content as unknown[]).length
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
      const textParts: string[] = [];
      const toolResults: ToolResult[] = [];

      for (const block of entry.message.content) {
        if (block.type === "text" && block.text) {
          textParts.push(block.text);
        } else if (block.type === "tool_result" && block.tool_use_id) {
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
