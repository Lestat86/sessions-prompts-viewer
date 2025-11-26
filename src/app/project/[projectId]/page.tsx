import Link from "next/link";
import { getSessions } from "@/lib/claude-reader";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: Props) {
  const { projectId } = await params;
  const decodedProjectId = decodeURIComponent(projectId);
  const sessions = await getSessions(decodedProjectId);

  // Extract project name from the encoded path
  const projectName = decodedProjectId.split("-").pop() || decodedProjectId;

  return (
    <div className="min-h-screen p-8">
      <header className="max-w-4xl mx-auto mb-8">
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-2 inline-block"
        >
          &larr; Back to Projects
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {projectName}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm font-mono">
          {decodedProjectId.replace(/-/g, "/")}
        </p>
      </header>

      <main className="max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Sessions ({sessions.length})
        </h2>

        {sessions.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400">
              No sessions found for this project
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/project/${encodeURIComponent(decodedProjectId)}/session/${session.id}`}
                className="block bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                      {session.title}
                    </h3>
                    {session.firstMessage && session.firstMessage !== session.title && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {session.firstMessage}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 text-sm text-gray-500 dark:text-gray-400 shrink-0">
                    <span>{session.messageCount} messages</span>
                    <span>{session.lastModified.toLocaleDateString()}</span>
                    <span className="text-xs">
                      {session.lastModified.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
