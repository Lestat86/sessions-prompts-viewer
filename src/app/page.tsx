import Link from "next/link";
import { getProjects } from "@/lib/claude-reader";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await getProjects();

  return (
    <div className="min-h-screen p-8">
      <header className="max-w-4xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Claude Prompt Viewer
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Browse your Claude Code conversation history
        </p>
      </header>

      <main className="max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Projects ({projects.length})
        </h2>

        {projects.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400">
              No Claude Code projects found in ~/.claude/projects
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/project/${encodeURIComponent(project.id)}`}
                className="block bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                      {project.path}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>{project.sessionsCount} sessions</span>
                    <span>
                      {project.lastModified.toLocaleDateString()}
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
