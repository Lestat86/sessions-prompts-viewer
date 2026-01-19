import { getSearchableProviders, getSearchableProjects } from "@/lib/providers";
import ViewModeToggle from "@/components/ViewModeToggle";
import SearchClient from "./SearchClient";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const [providers, projects] = await Promise.all([
    getSearchableProviders(),
    getSearchableProjects(),
  ]);

  return (
    <div className="min-h-screen pb-8">
      <div className="p-8">
        <header className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Search
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Search across all conversations from all providers
              </p>
            </div>
            <ViewModeToggle />
          </div>
        </header>

        <main className="max-w-4xl mx-auto">
          <SearchClient providers={providers} projects={projects} />
        </main>
      </div>
    </div>
  );
}
