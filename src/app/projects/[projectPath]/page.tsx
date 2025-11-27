import Link from "next/link";
import { notFound } from "next/navigation";
import { getUnifiedProjects, getProvider } from "@/lib/providers";
import ViewModeToggle from "@/components/ViewModeToggle";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ projectPath: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { projectPath } = await params;
  const decodedPath = decodeURIComponent(projectPath);

  const projects = await getUnifiedProjects();
  const project = projects.find((p) => p.path === decodedPath);

  if (!project) {
    notFound();
  }

  // Get sessions for each provider
  const providerSessions = await Promise.all(
    project.providers.map(async (p) => {
      const provider = getProvider(p.providerId);
      if (!provider) return null;

      const sessions = await provider.getSessions(p.projectId);
      return {
        ...p,
        sessions,
      };
    })
  );

  const validProviderSessions = providerSessions.filter((p) => p !== null);

  return (
    <div className="min-h-screen pb-8">
      <div className="p-8">
        <header className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/projects"
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              &larr; All Projects
            </Link>
            <ViewModeToggle />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {project.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 font-mono text-sm">
            {project.path}
          </p>
          <div className="flex items-center gap-2 mt-3">
            {project.providers.map((p) => (
              <span
                key={p.providerId}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm"
              >
                <span className="font-bold">{p.providerIcon}</span>
                <span className="text-gray-600 dark:text-gray-400">
                  {p.providerName}
                </span>
                <span className="text-gray-400 dark:text-gray-500">
                  ({p.sessionsCount})
                </span>
              </span>
            ))}
          </div>
        </header>

        <main className="max-w-4xl mx-auto space-y-8">
          {validProviderSessions.map((providerData) => (
            <section key={providerData.providerId}>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-lg font-bold">
                  {providerData.providerIcon}
                </span>
                {providerData.providerName}
                <span className="text-gray-400 dark:text-gray-500 font-normal text-base">
                  ({providerData.sessions.length} sessions)
                </span>
              </h2>

              {providerData.sessions.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-lg p-6 text-center border border-gray-200 dark:border-gray-800">
                  <p className="text-gray-500 dark:text-gray-400">
                    No sessions found
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {providerData.sessions.map((session) => (
                    <Link
                      key={session.id}
                      href={`/${providerData.providerId}/project/${encodeURIComponent(providerData.projectId)}/session/${encodeURIComponent(session.id)}`}
                      className="block bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {session.title || "Untitled Session"}
                          </h3>
                          {session.firstMessage && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                              {session.firstMessage}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
                            {session.model && <span>{session.model}</span>}
                            {session.cwd && (
                              <span className="truncate max-w-[200px]">
                                {session.cwd}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 ml-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>{session.messageCount} messages</span>
                          <span className="text-xs">
                            {session.lastModified.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
