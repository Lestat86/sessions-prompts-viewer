import Link from "next/link";
import { notFound } from "next/navigation";
import { getProvider, getAvailableProviders } from "@/lib/providers";
import { ProviderId } from "@/types/providers";
import ProviderTabs from "@/components/ProviderTabs";
import ProviderChatView from "./ProviderChatView";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ provider: string; projectId: string; sessionId: string }>;
}

export default async function SessionPage({ params }: Props) {
  const { provider: providerId, projectId, sessionId } = await params;
  const decodedProjectId = decodeURIComponent(projectId);

  const provider = getProvider(providerId as ProviderId);
  if (!provider) {
    notFound();
  }

  const [messages, sessions, projects, allProviders] = await Promise.all([
    provider.getMessages(decodedProjectId, sessionId),
    provider.getSessions(decodedProjectId),
    provider.getProjects(),
    getAvailableProviders(),
  ]);

  const currentSession = sessions.find((s) => s.id === sessionId);
  const currentProject = projects.find((p) => p.id === decodedProjectId);
  const projectName = currentProject?.name || decodedProjectId;

  return (
    <div className="min-h-screen flex flex-col pb-20">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-8 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm mb-2">
            <Link
              href={`/${providerId}`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {provider.name}
            </Link>
            <span className="text-gray-400">/</span>
            <Link
              href={`/${providerId}/project/${encodeURIComponent(decodedProjectId)}`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {projectName}
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 dark:text-gray-400">Session</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 line-clamp-1">
            {currentSession?.title || "Session"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {messages.length} messages
            {currentSession && (
              <> &middot; {currentSession.lastModified.toLocaleString()}</>
            )}
            {currentSession?.gitBranch && (
              <> &middot; {currentSession.gitBranch}</>
            )}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <ProviderChatView messages={messages} />
      </main>

      <ProviderTabs
        providers={allProviders}
        currentProvider={providerId as ProviderId}
      />
    </div>
  );
}
