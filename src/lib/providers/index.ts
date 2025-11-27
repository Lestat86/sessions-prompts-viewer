import { IProvider, ProviderId, ProviderInfo } from "@/types/providers";
import { claudeProvider } from "./claude-provider";
import { codexProvider, codeProvider } from "./codex-provider";
import { opencodeProvider } from "./opencode-provider";

// All available providers
const providers: IProvider[] = [claudeProvider, codexProvider, codeProvider, opencodeProvider];

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

// Export individual providers
export { claudeProvider, codexProvider, codeProvider, opencodeProvider };
