import { promises as fs } from "fs";
import path from "path";
import os from "os";
import {
  ClaudeProject,
  ClaudeSession,
  SessionEntry,
  ChatMessage,
  MessageContent,
  TextContent,
  ThinkingContent,
  ToolUseContent,
  ToolResultContent,
} from "@/types/claude";

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const PROJECTS_DIR = path.join(CLAUDE_DIR, "projects");

/**
 * Decode project directory name to original path
 */
function decodeProjectPath(encodedPath: string): string {
  return encodedPath.replace(/-/g, "/");
}

/**
 * Get project name from path
 */
function getProjectName(projectPath: string): string {
  const parts = projectPath.split("/").filter(Boolean);
  return parts[parts.length - 1] || projectPath;
}

/**
 * List all Claude projects
 */
export async function getProjects(): Promise<ClaudeProject[]> {
  try {
    const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
    const projects: ClaudeProject[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectDir = path.join(PROJECTS_DIR, entry.name);
        const sessions = await fs.readdir(projectDir);
        const jsonlFiles = sessions.filter((f) => f.endsWith(".jsonl") && !f.startsWith("agent-"));

        if (jsonlFiles.length > 0) {
          const stats = await fs.stat(projectDir);
          const decodedPath = decodeProjectPath(entry.name);

          projects.push({
            id: entry.name,
            path: decodedPath,
            name: getProjectName(decodedPath),
            sessionsCount: jsonlFiles.length,
            lastModified: stats.mtime,
          });
        }
      }
    }

    // Sort by last modified (most recent first)
    return projects.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  } catch (error) {
    console.error("Error reading projects:", error);
    return [];
  }
}

/**
 * Get sessions for a specific project
 */
export async function getSessions(projectId: string): Promise<ClaudeSession[]> {
  try {
    const projectDir = path.join(PROJECTS_DIR, projectId);
    const files = await fs.readdir(projectDir);
    const jsonlFiles = files.filter((f) => f.endsWith(".jsonl") && !f.startsWith("agent-"));

    const sessions: ClaudeSession[] = [];

    for (const file of jsonlFiles) {
      const sessionId = file.replace(".jsonl", "");
      const filePath = path.join(projectDir, file);
      const stats = await fs.stat(filePath);

      // Read first few lines to get session info
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n").filter(Boolean);

      let firstUserMessage: string | undefined;
      let messageCount = 0;
      let createdAt: Date | undefined;

      for (const line of lines) {
        try {
          const entry: SessionEntry = JSON.parse(line);

          if (entry.type === "user" || entry.type === "assistant") {
            messageCount++;

            if (!createdAt && entry.timestamp) {
              createdAt = new Date(entry.timestamp);
            }

            if (!firstUserMessage && entry.type === "user" && entry.message) {
              const msg = entry.message;
              if (typeof msg.content === "string") {
                firstUserMessage = msg.content.slice(0, 200);
              }
            }
          }
        } catch {
          // Skip invalid JSON lines
        }
      }

      sessions.push({
        id: sessionId,
        projectId,
        title: firstUserMessage?.split("\n")[0]?.slice(0, 100) || "Untitled Session",
        firstMessage: firstUserMessage,
        messageCount,
        createdAt: createdAt || stats.birthtime,
        lastModified: stats.mtime,
      });
    }

    // Sort by last modified (most recent first)
    return sessions.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  } catch (error) {
    console.error("Error reading sessions:", error);
    return [];
  }
}

/**
 * Parse session file and return chat messages
 */
export async function getSessionMessages(
  projectId: string,
  sessionId: string
): Promise<ChatMessage[]> {
  try {
    const filePath = path.join(PROJECTS_DIR, projectId, `${sessionId}.jsonl`);
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n").filter(Boolean);

    const messages: ChatMessage[] = [];
    const seenIds = new Set<string>();

    for (const line of lines) {
      try {
        const entry: SessionEntry = JSON.parse(line);

        if ((entry.type === "user" || entry.type === "assistant") && entry.message) {
          // Skip duplicates (same uuid)
          if (seenIds.has(entry.uuid)) {
            // Update existing message if this one has more content
            const existingIdx = messages.findIndex((m) => m.id === entry.uuid);
            if (existingIdx >= 0 && entry.type === "assistant") {
              const newContent = entry.message.content;
              if (Array.isArray(newContent)) {
                const existingContent = messages[existingIdx].content;
                if (Array.isArray(existingContent)) {
                  // Merge content, keeping the more complete version
                  if (newContent.length > existingContent.length) {
                    messages[existingIdx] = parseMessage(entry);
                  }
                }
              }
            }
            continue;
          }

          seenIds.add(entry.uuid);
          messages.push(parseMessage(entry));
        }
      } catch {
        // Skip invalid JSON lines
      }
    }

    return messages;
  } catch (error) {
    console.error("Error reading session messages:", error);
    return [];
  }
}

function parseMessage(entry: SessionEntry): ChatMessage {
  const message: ChatMessage = {
    id: entry.uuid,
    role: entry.type as "user" | "assistant",
    timestamp: new Date(entry.timestamp),
    content: "",
  };

  if (!entry.message) return message;

  if (entry.type === "user") {
    const userMsg = entry.message;
    if (typeof userMsg.content === "string") {
      message.content = userMsg.content;
    } else if (Array.isArray(userMsg.content)) {
      // Tool results from user
      message.toolResults = userMsg.content as ToolResultContent[];
      message.content = userMsg.content;
    }
  } else if (entry.type === "assistant") {
    const assistantMsg = entry.message;
    if (Array.isArray(assistantMsg.content)) {
      message.content = assistantMsg.content as MessageContent[];

      // Extract thinking
      for (const block of assistantMsg.content) {
        if (block.type === "thinking" && "thinking" in block) {
          message.thinking = (block as ThinkingContent).thinking;
          break;
        }
      }

      // Extract tool calls
      const toolCalls: ToolUseContent[] = [];
      for (const block of assistantMsg.content) {
        if (block.type === "tool_use" && "name" in block) {
          toolCalls.push(block as ToolUseContent);
        }
      }
      if (toolCalls.length > 0) {
        message.toolCalls = toolCalls;
      }
    }
  }

  return message;
}

/**
 * Get text content from a message
 */
export function getTextContent(content: string | MessageContent[]): string {
  if (typeof content === "string") {
    return content;
  }

  return content
    .filter((c): c is TextContent => c.type === "text")
    .map((c) => c.text)
    .join("\n\n");
}
