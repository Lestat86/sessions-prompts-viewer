import { promises as fs } from "fs";
import path from "path";
import os from "os";
import {
  IProvider,
  ProviderId,
  ProviderProject,
  ProviderSession,
  ProviderMessage,
  ToolCall,
} from "@/types/providers";

interface CodexSessionMeta {
  id: string;
  timestamp: string;
  cwd: string;
  originator: string;
  cli_version: string;
  model_provider?: string;
  git?: {
    commit_hash: string;
    branch: string;
    repository_url: string;
  };
}

interface CodexEventMsg {
  type: string;
  message?: string;
  text?: string;
  images?: string[];
}

interface CodexResponseItem {
  type: string;
  role: string;
  content: ContentBlock[];
}

interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  id?: string;
  call_id?: string;
  arguments?: string;
  output?: string;
}

interface CodexRecord {
  type: string;
  timestamp: string;
  payload: CodexSessionMeta | CodexEventMsg | CodexResponseItem;
}

// Base provider for Codex-like tools (Codex, Code)
function createCodexLikeProvider(
  id: ProviderId,
  name: string,
  description: string,
  icon: string,
  baseDir: string
): IProvider {
  const sessionsDir = path.join(baseDir, "sessions");

  async function findAllSessions(): Promise<
    { filePath: string; date: string }[]
  > {
    const sessions: { filePath: string; date: string }[] = [];

    try {
      const years = await fs.readdir(sessionsDir);

      for (const year of years) {
        const yearPath = path.join(sessionsDir, year);
        const yearStat = await fs.stat(yearPath);
        if (!yearStat.isDirectory()) continue;

        const months = await fs.readdir(yearPath);
        for (const month of months) {
          const monthPath = path.join(yearPath, month);
          const monthStat = await fs.stat(monthPath);
          if (!monthStat.isDirectory()) continue;

          const days = await fs.readdir(monthPath);
          for (const day of days) {
            const dayPath = path.join(monthPath, day);
            const dayStat = await fs.stat(dayPath);
            if (!dayStat.isDirectory()) continue;

            const files = await fs.readdir(dayPath);
            for (const file of files) {
              if (file.endsWith(".jsonl") && file.startsWith("rollout-")) {
                sessions.push({
                  filePath: path.join(dayPath, file),
                  date: `${year}-${month}-${day}`,
                });
              }
            }
          }
        }
      }
    } catch {
      // Directory doesn't exist or not accessible
    }

    return sessions;
  }

  return {
    id,
    name,
    description,
    icon,

    async isAvailable(): Promise<boolean> {
      try {
        await fs.access(sessionsDir);
        return true;
      } catch {
        return false;
      }
    },

    async getProjects(): Promise<ProviderProject[]> {
      // Codex/Code organizes by date, not project
      // We'll group sessions by cwd (working directory) as "projects"
      const sessions = await findAllSessions();
      const projectMap = new Map<
        string,
        { sessions: number; lastModified: Date }
      >();

      for (const { filePath } of sessions) {
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const lines = content.split("\n").filter(Boolean);
          const stats = await fs.stat(filePath);

          for (const line of lines) {
            try {
              const record: CodexRecord = JSON.parse(line);
              if (record.type === "session_meta") {
                const meta = record.payload as CodexSessionMeta;
                const cwd = meta.cwd || "unknown";

                const existing = projectMap.get(cwd);
                if (existing) {
                  existing.sessions++;
                  if (stats.mtime > existing.lastModified) {
                    existing.lastModified = stats.mtime;
                  }
                } else {
                  projectMap.set(cwd, {
                    sessions: 1,
                    lastModified: stats.mtime,
                  });
                }
                break; // Only need session_meta
              }
            } catch {
              // Skip invalid JSON
            }
          }
        } catch {
          // Skip unreadable files
        }
      }

      const projects: ProviderProject[] = [];
      for (const [cwd, data] of projectMap) {
        const parts = cwd.split("/").filter(Boolean);
        projects.push({
          id: Buffer.from(cwd).toString("base64url"),
          providerId: id,
          path: cwd,
          name: parts[parts.length - 1] || cwd,
          sessionsCount: data.sessions,
          lastModified: data.lastModified,
        });
      }

      return projects.sort(
        (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
      );
    },

    async getSessions(projectId: string): Promise<ProviderSession[]> {
      const cwd = Buffer.from(projectId, "base64url").toString("utf-8");
      const allSessions = await findAllSessions();
      const sessions: ProviderSession[] = [];

      for (const { filePath, date } of allSessions) {
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const lines = content.split("\n").filter(Boolean);
          const stats = await fs.stat(filePath);

          let sessionMeta: CodexSessionMeta | null = null;
          let firstUserMessage: string | undefined;
          let messageCount = 0;

          for (const line of lines) {
            try {
              const record: CodexRecord = JSON.parse(line);

              if (record.type === "session_meta") {
                sessionMeta = record.payload as CodexSessionMeta;
              } else if (record.type === "event_msg") {
                const event = record.payload as CodexEventMsg;
                if (event.type === "user_message") {
                  messageCount++;
                  if (!firstUserMessage && event.message) {
                    firstUserMessage = event.message.slice(0, 200);
                  }
                } else if (event.type === "agent_reasoning") {
                  messageCount++;
                }
              } else if (record.type === "response_item") {
                const item = record.payload as CodexResponseItem;
                if (item.role === "user" || item.role === "assistant") {
                  messageCount++;
                  if (!firstUserMessage && item.role === "user") {
                    const textBlock = item.content?.find(
                      (b) => b.type === "input_text" || b.type === "text"
                    );
                    if (textBlock?.text) {
                      firstUserMessage = textBlock.text.slice(0, 200);
                    }
                  }
                }
              }
            } catch {
              // Skip invalid JSON
            }
          }

          // Only include sessions from this project (cwd)
          if (sessionMeta && sessionMeta.cwd === cwd) {
            sessions.push({
              id: sessionMeta.id,
              providerId: id,
              projectId,
              title:
                firstUserMessage?.split("\n")[0]?.slice(0, 100) ||
                `Session ${date}`,
              firstMessage: firstUserMessage,
              messageCount,
              cwd: sessionMeta.cwd,
              gitBranch: sessionMeta.git?.branch,
              model: sessionMeta.model_provider,
              createdAt: new Date(sessionMeta.timestamp),
              lastModified: stats.mtime,
            });
          }
        } catch {
          // Skip unreadable files
        }
      }

      return sessions.sort(
        (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
      );
    },

    async getMessages(
      projectId: string,
      sessionId: string
    ): Promise<ProviderMessage[]> {
      const allSessions = await findAllSessions();
      const messages: ProviderMessage[] = [];

      // Find the session file
      for (const { filePath } of allSessions) {
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const lines = content.split("\n").filter(Boolean);

          let isTargetSession = false;

          for (const line of lines) {
            try {
              const record: CodexRecord = JSON.parse(line);

              if (record.type === "session_meta") {
                const meta = record.payload as CodexSessionMeta;
                if (meta.id === sessionId) {
                  isTargetSession = true;
                } else {
                  break; // Wrong session
                }
              } else if (isTargetSession) {
                if (record.type === "event_msg") {
                  const event = record.payload as CodexEventMsg;
                  if (event.type === "user_message" && event.message) {
                    messages.push({
                      id: `user-${messages.length}`,
                      role: "user",
                      timestamp: new Date(record.timestamp),
                      content: event.message,
                    });
                  } else if (event.type === "agent_reasoning" && event.text) {
                    messages.push({
                      id: `assistant-${messages.length}`,
                      role: "assistant",
                      timestamp: new Date(record.timestamp),
                      content: event.text,
                    });
                  }
                } else if (record.type === "response_item") {
                  const item = record.payload as CodexResponseItem;
                  if (item.role === "user" || item.role === "assistant") {
                    const textContent: string[] = [];
                    const toolCalls: ToolCall[] = [];

                    for (const block of item.content || []) {
                      if (
                        (block.type === "input_text" || block.type === "text") &&
                        block.text
                      ) {
                        textContent.push(block.text);
                      } else if (
                        block.type === "function_call" &&
                        block.name &&
                        block.call_id
                      ) {
                        toolCalls.push({
                          id: block.call_id,
                          name: block.name,
                          input: block.arguments
                            ? JSON.parse(block.arguments)
                            : {},
                        });
                      }
                    }

                    if (textContent.length > 0 || toolCalls.length > 0) {
                      const msg: ProviderMessage = {
                        id: `${item.role}-${messages.length}`,
                        role: item.role as "user" | "assistant",
                        timestamp: new Date(record.timestamp),
                        content: textContent.join("\n"),
                      };
                      if (toolCalls.length > 0) {
                        msg.toolCalls = toolCalls;
                      }
                      messages.push(msg);
                    }
                  }
                }
              }
            } catch {
              // Skip invalid JSON
            }
          }

          if (isTargetSession) {
            break; // Found our session
          }
        } catch {
          // Skip unreadable files
        }
      }

      return messages;
    },
  };
}

// Codex provider
export const codexProvider = createCodexLikeProvider(
  "codex",
  "Codex",
  "OpenAI Codex CLI",
  "X",
  path.join(os.homedir(), ".codex")
);

// Code provider (just-every/code)
export const codeProvider = createCodexLikeProvider(
  "code",
  "Code",
  "just-every/code CLI",
  "J",
  path.join(os.homedir(), ".code")
);
