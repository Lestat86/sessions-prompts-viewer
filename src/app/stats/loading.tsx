import ViewModeToggle from "@/components/ViewModeToggle";

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 animate-pulse ${className}`}
    >
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-1" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32" />
    </div>
  );
}

function SkeletonProviderButton() {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
      <div className="h-[200px] bg-gray-100 dark:bg-gray-700/50 rounded" />
    </div>
  );
}

function SkeletonHeatmap() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
      <div className="flex gap-0.5">
        {/* Simulated week columns */}
        {Array.from({ length: 20 }).map((_, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-0.5">
            {Array.from({ length: 7 }).map((_, dayIdx) => (
              <div
                key={dayIdx}
                className="w-[10px] h-[10px] bg-gray-200 dark:bg-gray-700 rounded-sm"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StatsLoading() {
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
                Loading activity data...
              </p>
            </div>
            <ViewModeToggle />
          </div>
        </header>

        <main className="max-w-6xl mx-auto space-y-6">
          {/* Provider filter skeleton */}
          <div className="flex flex-wrap gap-2">
            <SkeletonProviderButton />
            <SkeletonProviderButton />
            <SkeletonProviderButton />
          </div>

          {/* Summary stats skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>

          {/* Charts skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonHeatmap />
            <SkeletonChart />
          </div>
        </main>
      </div>
    </div>
  );
}
