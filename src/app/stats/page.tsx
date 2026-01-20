import { getStatisticsData } from "@/lib/providers/stats";
import ViewModeToggle from "@/components/ViewModeToggle";
import StatsClient from "./StatsClient";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const statsData = await getStatisticsData();

  return (
    <div className="min-h-screen pb-8">
      <div className="p-8">
        <header className="max-w-6xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Statistics
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Activity overview across all providers
              </p>
            </div>
            <ViewModeToggle />
          </div>
        </header>

        <main className="max-w-6xl mx-auto">
          <StatsClient data={statsData} />
        </main>
      </div>
    </div>
  );
}
