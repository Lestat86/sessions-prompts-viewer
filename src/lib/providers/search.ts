import { SearchFilters, SearchResult, SearchResponse } from "@/types/search";
import { ProviderId, ProviderMessage } from "@/types/providers";
import {
  claudeProvider,
  codexProvider,
  codeProvider,
  opencodeProvider,
} from "./index";

const providers = [claudeProvider, codexProvider, codeProvider, opencodeProvider];

/**
 * Converts a wildcard pattern to a case-insensitive regex
 * Supports * as wildcard matching any characters
 */
export function wildcardToRegex(pattern: string): RegExp {
  // Escape special regex characters except *
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  // Replace * with .*
  const regexPattern = escaped.replace(/\*/g, ".*");
  return new RegExp(regexPattern, "gi");
}

/**
 * Generates a snippet with context around the match
 * Returns ~50 characters before and after the match
 */
export function generateSnippet(
  text: string,
  matchIndex: number,
  matchLength: number,
  contextLength: number = 50
): { snippet: string; matchStart: number } {
  const start = Math.max(0, matchIndex - contextLength);
  const end = Math.min(text.length, matchIndex + matchLength + contextLength);

  let snippet = text.slice(start, end);

  // Add ellipsis if truncated
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";

  snippet = prefix + snippet + suffix;

  // Calculate new match position in the snippet
  const matchStart = prefix.length + (matchIndex - start);

  // Clean up whitespace
  snippet = snippet.replace(/\s+/g, " ");

  return { snippet, matchStart };
}

/**
 * Search through all messages across all providers.
 * Parallelized across providers and projects for speed.
 */
export async function searchMessages(
  filters: SearchFilters,
  limit: number = 50,
  offset: number = 0
): Promise<SearchResponse> {
  const regex = wildcardToRegex(filters.query);

  // Filter providers if specified
  const providersToSearch = filters.providers
    ? providers.filter((p) => filters.providers!.includes(p.id))
    : providers;

  // Run all providers in parallel
  const providerResults = await Promise.all(
    providersToSearch.map(async (provider) => {
      const available = await provider.isAvailable();
      if (!available) return [];

      const projects = await provider.getProjects();

      const projectsToSearch = filters.projects
        ? projects.filter((p) => filters.projects!.includes(p.id))
        : projects;

      // Run all projects in parallel
      const projectResults = await Promise.all(
        projectsToSearch.map(async (project) => {
          const sessions = await provider.getSessions(project.id);
          const results: SearchResult[] = [];

          // Run all sessions in parallel
          const sessionResults = await Promise.all(
            sessions.map(async (session) => {
              // Check date range filter at session level for efficiency
              if (filters.dateRange) {
                if (
                  filters.dateRange.from &&
                  session.lastModified < filters.dateRange.from
                ) {
                  return [];
                }
                if (
                  filters.dateRange.to &&
                  session.createdAt > filters.dateRange.to
                ) {
                  return [];
                }
              }

              const messages = await provider.getMessages(
                project.id,
                session.id
              );
              const sessionResults: SearchResult[] = [];

              for (const message of messages) {
                // Filter by author
                if (filters.authors && filters.authors.length > 0) {
                  if (
                    !filters.authors.includes(
                      message.role as "user" | "assistant"
                    )
                  ) {
                    continue;
                  }
                }

                // Filter by date range at message level
                if (filters.dateRange) {
                  if (
                    filters.dateRange.from &&
                    message.timestamp < filters.dateRange.from
                  ) {
                    continue;
                  }
                  if (
                    filters.dateRange.to &&
                    message.timestamp > filters.dateRange.to
                  ) {
                    continue;
                  }
                }

                // Search in message content
                const content = getMessageText(message);
                const localRegex = new RegExp(regex.source, regex.flags);
                const match = localRegex.exec(content);

                if (match) {
                  const { snippet, matchStart } = generateSnippet(
                    content,
                    match.index,
                    match[0].length
                  );

                  sessionResults.push({
                    providerId: provider.id,
                    providerName: provider.name,
                    providerIcon: provider.icon,
                    projectId: project.id,
                    projectName: project.name,
                    sessionId: session.id,
                    messageId: message.id,
                    role: message.role as "user" | "assistant",
                    timestamp: message.timestamp,
                    snippet,
                    matchStart,
                    matchLength: match[0].length,
                    url: `/${provider.id}/project/${project.id}/session/${session.id}#msg-${message.id}`,
                  });
                }
              }

              return sessionResults;
            })
          );

          return sessionResults.flat();
        })
      );

      return projectResults.flat();
    })
  );

  const results = providerResults.flat();

  // Sort by timestamp descending (most recent first)
  results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Apply pagination
  const total = results.length;
  const paginatedResults = results.slice(offset, offset + limit);

  return {
    results: paginatedResults,
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * Extract searchable text from a message
 */
function getMessageText(message: ProviderMessage): string {
  let text = message.content || "";

  // Include thinking if present
  if (message.thinking) {
    text += "\n" + message.thinking;
  }

  return text;
}

/**
 * Get all available providers with their info
 */
export async function getSearchableProviders(): Promise<
  { id: ProviderId; name: string; icon: string; available: boolean }[]
> {
  const result = await Promise.all(
    providers.map(async (provider) => ({
      id: provider.id,
      name: provider.name,
      icon: provider.icon,
      available: await provider.isAvailable(),
    }))
  );
  return result;
}

/**
 * Get all available projects across all providers
 */
export async function getSearchableProjects(): Promise<
  { id: string; name: string; providerId: ProviderId }[]
> {
  const allProjects = await Promise.all(
    providers.map(async (provider) => {
      const available = await provider.isAvailable();
      if (!available) return [];

      const projects = await provider.getProjects();
      return projects.map((project) => ({
        id: project.id,
        name: project.name,
        providerId: provider.id,
      }));
    })
  );
  return allProjects.flat();
}
