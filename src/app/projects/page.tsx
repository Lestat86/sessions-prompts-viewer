import Link from "next/link";
import { getUnifiedProjects } from "@/lib/providers";
import ViewModeToggle from "@/components/ViewModeToggle";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await getUnifiedProjects();

  return (
    <div className="min-h-screen pb-8">
      <div className="p-8">
        <header className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                All Projects
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Browse projects across all AI coding tools
              </p>
            </div>
            <ViewModeToggle />
          </div>
        </header>

        <main className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Projects ({projects.length})
          </h2>

          {projects.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-800">
              <p className="text-gray-500 dark:text-gray-400">
                No projects found. Start using an AI coding tool to see your conversations here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <Link
                  key={project.path}
                  href={`/projects/${encodeURIComponent(project.path)}`}
                  className="block bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {project.name}
                        </h3>
                        {/* Tool indicators */}
                        <div className="flex items-center gap-1">
                          {project.providers.map((p) => (
                            <span
                              key={p.providerId}
                              className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-400"
                              title={`${p.providerName}: ${p.sessionsCount} sessions`}
                            >
                              {p.providerIcon}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                        {project.path}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 ml-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>{project.totalSessions} sessions</span>
                      <span>{project.lastModified.toLocaleDateString()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
