"use client";

import { ProviderId } from "@/types/providers";

interface ProviderOption {
  id: ProviderId;
  name: string;
  icon: string;
  available: boolean;
}

interface ProjectOption {
  id: string;
  name: string;
  providerId: ProviderId;
}

interface Props {
  providers: ProviderOption[];
  projects: ProjectOption[];
  selectedProviders: ProviderId[];
  selectedProjects: string[];
  selectedAuthors: ("user" | "assistant")[];
  dateFrom: string;
  dateTo: string;
  onProvidersChange: (providers: ProviderId[]) => void;
  onProjectsChange: (projects: string[]) => void;
  onAuthorsChange: (authors: ("user" | "assistant")[]) => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  disabled?: boolean;
}

export default function SearchFilters({
  providers,
  projects,
  selectedProviders,
  selectedProjects,
  selectedAuthors,
  dateFrom,
  dateTo,
  onProvidersChange,
  onProjectsChange,
  onAuthorsChange,
  onDateFromChange,
  onDateToChange,
  disabled = false,
}: Props) {
  const toggleProvider = (providerId: ProviderId) => {
    if (selectedProviders.includes(providerId)) {
      onProvidersChange(selectedProviders.filter((p) => p !== providerId));
    } else {
      onProvidersChange([...selectedProviders, providerId]);
    }
  };

  const toggleAuthor = (author: "user" | "assistant") => {
    if (selectedAuthors.includes(author)) {
      onAuthorsChange(selectedAuthors.filter((a) => a !== author));
    } else {
      onAuthorsChange([...selectedAuthors, author]);
    }
  };

  const availableProviders = providers.filter((p) => p.available);

  // Filter projects based on selected providers
  const filteredProjects =
    selectedProviders.length > 0
      ? projects.filter((p) => selectedProviders.includes(p.providerId))
      : projects;

  return (
    <div className={`space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg relative ${disabled ? "opacity-60" : ""}`}>
      {/* Disabled overlay */}
      {disabled && (
        <div className="absolute inset-0 z-10 cursor-not-allowed" />
      )}

      {/* Provider Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Providers
        </label>
        <div className="flex flex-wrap gap-2">
          {availableProviders.map((provider) => {
            const isSelected = selectedProviders.includes(provider.id);
            return (
              <button
                key={provider.id}
                onClick={() => toggleProvider(provider.id)}
                disabled={disabled}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                  isSelected
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-600 text-xs font-bold">
                  {provider.icon}
                </span>
                {provider.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Author Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Author
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => toggleAuthor("user")}
            disabled={disabled}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors disabled:cursor-not-allowed ${
              selectedAuthors.includes("user")
                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
            }`}
          >
            User
          </button>
          <button
            onClick={() => toggleAuthor("assistant")}
            disabled={disabled}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors disabled:cursor-not-allowed ${
              selectedAuthors.includes("assistant")
                ? "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-400 dark:border-gray-500"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
            }`}
          >
            Assistant
          </button>
        </div>
      </div>

      {/* Date Range */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            From
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            To
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800"
          />
        </div>
      </div>

      {/* Project Filter */}
      {filteredProjects.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project
          </label>
          <select
            value={selectedProjects[0] || ""}
            onChange={(e) =>
              onProjectsChange(e.target.value ? [e.target.value] : [])
            }
            disabled={disabled}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800"
          >
            <option value="">All projects</option>
            {filteredProjects.map((project) => (
              <option key={`${project.providerId}-${project.id}`} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
