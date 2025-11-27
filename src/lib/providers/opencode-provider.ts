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

const OPENCODE_DIR = path.join(os.homedir(), ".local", "share", "opencode");
const STORAGE_DIR = path.join(OPENCODE_DIR, "storage");

interface OpenCodeProject {
  id: string;
  worktree: string;
  vcsDir?: string;
  vcs?: string;
  time: {
    created: number;
  };
}

interface OpenCodeSession {
  id: string;
  version: string;
  projectID: string;
  directory: string;
  title?: string;
  time: {
    created: number;
    updated: number;
  };
  summary?: {
    additions: number;
    deletions: number;
    files: number;
  };
  agent?: string;
  model?: {
    providerID: string;
    modelID: string;
  };
}

interface OpenCodeMessage {
  id: string;
  sessionID: string;
  role: "user" | "assistant";
  time: {
    created: number;
    completed?: number;
  };
  parentID?: string;
  modelID?: string;
  providerID?: string;
  mode?: string;
  path?: {
    cwd: string;
    root: string;
  };
  cost?: number;
  tokens?: {
    input: number;
    output: number;
    reasoning: number;
    cache?: {
      read: number;
      write: number;
    };
  };
  finish?: string;
  summary?: {
    title?: string;
    body?: string;
    diffs?: unknown[];
  };
}

interface OpenCodePart {
  id: string;
  sessionID: string;
  messageID: string;
  type: "text" | "tool" | "thinking";
  text?: string;
  thinking?: string;
  callID?: string;
  tool?: string;
  state?: {
    status: string;
    input?: Record<string, unknown>;
    output?: string;
    title?: string;
    metadata?: Record<string, unknown>;
    time?: {
      start: number;
      end: number;
    };
  };
}

export const opencodeProvider: IProvider = {
  id: "opencode",
  name: "OpenCode",
  description: "OpenCode AI CLI",
  icon: "O",

  async isAvailable(): Promise<boolean> {
    try {
      await fs.access(STORAGE_DIR);
      return true;
    } catch {
      return false;
    }
  },

  async getProjects(): Promise<ProviderProject[]> {
    try {
      const projectDir = path.join(STORAGE_DIR, "project");
      const files = await fs.readdir(projectDir);
      const projects: ProviderProject[] = [];

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        try {
          const content = await fs.readFile(
            path.join(projectDir, file),
            "utf-8"
          );
          const project: OpenCodeProject = JSON.parse(content);

          // Count sessions for this project
          const sessionDir = path.join(STORAGE_DIR, "session", project.id);
          let sessionsCount = 0;
          let lastModified = new Date(project.time.created);

          try {
            const sessionFiles = await fs.readdir(sessionDir);
            sessionsCount = sessionFiles.filter((f) =>
              f.endsWith(".json")
            ).length;

            // Get last modified from session files
            for (const sf of sessionFiles) {
              if (!sf.endsWith(".json")) continue;
              const stats = await fs.stat(path.join(sessionDir, sf));
              if (stats.mtime > lastModified) {
                lastModified = stats.mtime;
              }
            }
          } catch {
            // No sessions yet
          }

          const parts = project.worktree.split("/").filter(Boolean);
          projects.push({
            id: project.id,
            providerId: "opencode",
            path: project.worktree,
            name: parts[parts.length - 1] || project.worktree,
            sessionsCount,
            lastModified,
          });
        } catch {
          // Skip invalid files
        }
      }

      return projects.sort(
        (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
      );
    } catch (error) {
      console.error("Error reading OpenCode projects:", error);
      return [];
    }
  },

  async getSessions(projectId: string): Promise<ProviderSession[]> {
    try {
      const sessionDir = path.join(STORAGE_DIR, "session", projectId);
      const files = await fs.readdir(sessionDir);
      const sessions: ProviderSession[] = [];

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        try {
          const content = await fs.readFile(
            path.join(sessionDir, file),
            "utf-8"
          );
          const session: OpenCodeSession = JSON.parse(content);

          // Count messages
          let messageCount = 0;
          let firstMessage: string | undefined;

          try {
            const messageDir = path.join(STORAGE_DIR, "message", session.id);
            const msgFiles = await fs.readdir(messageDir);
            messageCount = msgFiles.filter((f) => f.endsWith(".json")).length;

            // Get first user message
            for (const mf of msgFiles.sort()) {
              if (!mf.endsWith(".json")) continue;
              const msgContent = await fs.readFile(
                path.join(messageDir, mf),
                "utf-8"
              );
              const msg: OpenCodeMessage = JSON.parse(msgContent);

              if (msg.role === "user") {
                // Get parts for this message
                const partDir = path.join(STORAGE_DIR, "part", msg.id);
                try {
                  const partFiles = await fs.readdir(partDir);
                  for (const pf of partFiles.sort()) {
                    if (!pf.endsWith(".json")) continue;
                    const partContent = await fs.readFile(
                      path.join(partDir, pf),
                      "utf-8"
                    );
                    const part: OpenCodePart = JSON.parse(partContent);
                    if (part.type === "text" && part.text) {
                      firstMessage = part.text.slice(0, 200);
                      break;
                    }
                  }
                } catch {
                  // No parts
                }
                if (firstMessage) break;
              }
            }
          } catch {
            // No messages
          }

          sessions.push({
            id: session.id,
            providerId: "opencode",
            projectId,
            title: session.title || firstMessage?.split("\n")[0]?.slice(0, 100) || "Untitled Session",
            firstMessage,
            messageCount,
            cwd: session.directory,
            model: session.model?.modelID,
            createdAt: new Date(session.time.created),
            lastModified: new Date(session.time.updated),
          });
        } catch {
          // Skip invalid files
        }
      }

      return sessions.sort(
        (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
      );
    } catch (error) {
      console.error("Error reading OpenCode sessions:", error);
      return [];
    }
  },

  async getMessages(
    projectId: string,
    sessionId: string
  ): Promise<ProviderMessage[]> {
    try {
      const messageDir = path.join(STORAGE_DIR, "message", sessionId);
      const files = await fs.readdir(messageDir);
      const messages: ProviderMessage[] = [];

      // Sort files to maintain order
      const sortedFiles = files.filter((f) => f.endsWith(".json")).sort();

      for (const file of sortedFiles) {
        try {
          const content = await fs.readFile(
            path.join(messageDir, file),
            "utf-8"
          );
          const msg: OpenCodeMessage = JSON.parse(content);

          // Get parts for this message
          const parts: OpenCodePart[] = [];
          try {
            const partDir = path.join(STORAGE_DIR, "part", msg.id);
            const partFiles = await fs.readdir(partDir);

            for (const pf of partFiles.sort()) {
              if (!pf.endsWith(".json")) continue;
              const partContent = await fs.readFile(
                path.join(partDir, pf),
                "utf-8"
              );
              parts.push(JSON.parse(partContent));
            }
          } catch {
            // No parts
          }

          // Build message from parts
          const textParts: string[] = [];
          const toolCalls: ToolCall[] = [];
          const toolResults: ToolResult[] = [];
          let thinking: string | undefined;

          for (const part of parts) {
            if (part.type === "text" && part.text) {
              textParts.push(part.text);
            } else if (part.type === "thinking" && part.thinking) {
              thinking = part.thinking;
            } else if (part.type === "tool" && part.tool && part.state) {
              // Tool call
              if (part.state.input) {
                toolCalls.push({
                  id: part.callID || part.id,
                  name: part.tool,
                  input: part.state.input,
                });
              }
              // Tool result
              if (part.state.output || part.state.status === "completed") {
                toolResults.push({
                  toolCallId: part.callID || part.id,
                  content: part.state.output || "(completed)",
                  isError: part.state.status === "error",
                });
              }
            }
          }

          const message: ProviderMessage = {
            id: msg.id,
            role: msg.role,
            timestamp: new Date(msg.time.created),
            content: textParts.join("\n\n"),
            thinking,
            metadata: {
              model: msg.modelID,
              provider: msg.providerID,
              tokens: msg.tokens,
            },
          };

          if (toolCalls.length > 0) {
            message.toolCalls = toolCalls;
          }
          if (toolResults.length > 0) {
            message.toolResults = toolResults;
          }

          messages.push(message);
        } catch {
          // Skip invalid files
        }
      }

      return messages;
    } catch (error) {
      console.error("Error reading OpenCode messages:", error);
      return [];
    }
  },
};
