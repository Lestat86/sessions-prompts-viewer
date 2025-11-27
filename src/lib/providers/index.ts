import { IProvider, ProviderId, ProviderInfo, ProviderProject } from "@/types/providers";
import { claudeProvider } from "./claude-provider";
import { codexProvider, codeProvider } from "./codex-provider";
import { opencodeProvider } from "./opencode-provider";

// All available providers
const providers: IProvider[] = [claudeProvider, codexProvider, codeProvider, opencodeProvider];

// Unified project (aggregated across providers)
export interface UnifiedProject {
  path: string;
  name: string;
  providers: {
    providerId: ProviderId;
    providerName: string;
    providerIcon: string;
    projectId: string;
    sessionsCount: number;
    lastModified: Date;
  }[];
  totalSessions: number;
  lastModified: Date;
}

// Get provider by ID
export function getProvider(id: ProviderId): IProvider | undefined {
  return providers.find((p) => p.id === id);
}

// Get all providers with availability status
export async function getAvailableProviders(): Promise<ProviderInfo[]> {
  const results: ProviderInfo[] = [];

  for (const provider of providers) {
    const available = await provider.isAvailable();
    results.push({
      id: provider.id,
      name: provider.name,
      description: provider.description,
      icon: provider.icon,
      baseDir: "",
      available,
    });
  }

  return results;
}

// Get all projects aggregated by path across all providers
export async function getUnifiedProjects(): Promise<UnifiedProject[]> {
  const projectsByPath = new Map<string, UnifiedProject>();

  for (const provider of providers) {
    const available = await provider.isAvailable();
    if (!available) continue;

    const projects = await provider.getProjects();

    for (const project of projects) {
      const existing = projectsByPath.get(project.path);

      if (existing) {
        existing.providers.push({
          providerId: provider.id,
          providerName: provider.name,
          providerIcon: provider.icon,
          projectId: project.id,
          sessionsCount: project.sessionsCount,
          lastModified: project.lastModified,
        });
        existing.totalSessions += project.sessionsCount;
        if (project.lastModified > existing.lastModified) {
          existing.lastModified = project.lastModified;
        }
      } else {
        projectsByPath.set(project.path, {
          path: project.path,
          name: project.name,
          providers: [{
            providerId: provider.id,
            providerName: provider.name,
            providerIcon: provider.icon,
            projectId: project.id,
            sessionsCount: project.sessionsCount,
            lastModified: project.lastModified,
          }],
          totalSessions: project.sessionsCount,
          lastModified: project.lastModified,
        });
      }
    }
  }

  return Array.from(projectsByPath.values()).sort(
    (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
  );
}

// Export individual providers
export { claudeProvider, codexProvider, codeProvider, opencodeProvider };
