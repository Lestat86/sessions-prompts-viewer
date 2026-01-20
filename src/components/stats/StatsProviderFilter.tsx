"use client";

import { ProviderId } from "@/types/providers";
import { StatsAggregate } from "@/types/stats";

interface ProviderInfo {
  id: ProviderId;
  name: string;
  icon: string;
}

interface Props {
  providers: ProviderInfo[];
  aggregate: StatsAggregate;
  selectedProvider: ProviderId | null;
  onProviderClick: (providerId: ProviderId) => void;
}

export default function StatsProviderFilter({
  providers,
  aggregate,
  selectedProvider,
  onProviderClick,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {providers.map((provider) => {
        const isSelected = selectedProvider === provider.id;
        const providerStats = aggregate.byProvider[provider.id];
        const messageCount = providerStats?.userMessages ?? 0;

        return (
          <button
            key={provider.id}
            onClick={() => onProviderClick(provider.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isSelected
                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-2 border-blue-400 dark:border-blue-600 shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm"
            }`}
          >
            <span
              className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                isSelected
                  ? "bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              }`}
            >
              {provider.icon}
            </span>
            <span>{provider.name}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-xs ${
                isSelected
                  ? "bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              }`}
            >
              {messageCount.toLocaleString()}
            </span>
          </button>
        );
      })}

      {selectedProvider && (
        <button
          onClick={() => onProviderClick(selectedProvider)}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          Clear filter
        </button>
      )}
    </div>
  );
}
