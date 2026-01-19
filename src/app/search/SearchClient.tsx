"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ProviderId } from "@/types/providers";
import SearchFilters from "@/components/SearchFilters";
import SearchResultItem from "@/components/SearchResultItem";

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

interface SearchResultData {
  providerId: string;
  providerName: string;
  providerIcon: string;
  projectId: string;
  projectName: string;
  sessionId: string;
  messageId: string;
  role: "user" | "assistant";
  timestamp: string;
  snippet: string;
  matchStart: number;
  matchLength: number;
  url: string;
}

interface Props {
  providers: ProviderOption[];
  projects: ProjectOption[];
}

export default function SearchClient({ providers, projects }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultData[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [selectedProviders, setSelectedProviders] = useState<ProviderId[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedAuthors, setSelectedAuthors] = useState<("user" | "assistant")[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Track if this is the first render to avoid triggering search on mount
  const isFirstRender = useRef(true);

  const buildSearchUrl = useCallback(
    (offset: number = 0) => {
      const params = new URLSearchParams();
      params.set("q", query);
      params.set("limit", "50");
      params.set("offset", offset.toString());

      if (selectedProviders.length > 0) {
        params.set("providers", selectedProviders.join(","));
      }
      if (selectedProjects.length > 0) {
        params.set("projects", selectedProjects.join(","));
      }
      if (selectedAuthors.length > 0) {
        params.set("authors", selectedAuthors.join(","));
      }
      if (dateFrom) {
        params.set("from", dateFrom);
      }
      if (dateTo) {
        params.set("to", dateTo);
      }

      return `/api/search?${params.toString()}`;
    },
    [query, selectedProviders, selectedProjects, selectedAuthors, dateFrom, dateTo]
  );

  const executeSearch = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const response = await fetch(buildSearchUrl(0));
      const data = await response.json();

      if (response.ok) {
        setResults(data.results);
        setTotal(data.total);
        setHasMore(data.hasMore);
      } else {
        console.error("Search error:", data.error);
        setResults([]);
        setTotal(0);
        setHasMore(false);
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
      setTotal(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [buildSearchUrl, query]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeSearch();
  };

  // Re-run search when filters change (only after initial search)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (searched && query.trim()) {
      executeSearch();
    }
  }, [selectedProviders, selectedProjects, selectedAuthors, dateFrom, dateTo]);

  const handleLoadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);

    try {
      const response = await fetch(buildSearchUrl(results.length));
      const data = await response.json();

      if (response.ok) {
        setResults((prev) => [...prev, ...data.results]);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error("Load more error:", error);
    } finally {
      setLoading(false);
    }
  };

  const activeFiltersCount =
    selectedProviders.length +
    selectedProjects.length +
    selectedAuthors.length +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages... (use * for wildcard)"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {/* Filters toggle */}
      <div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
          Filters
          {activeFiltersCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {showFilters && (
          <div className="mt-3">
            <SearchFilters
              providers={providers}
              projects={projects}
              selectedProviders={selectedProviders}
              selectedProjects={selectedProjects}
              selectedAuthors={selectedAuthors}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onProvidersChange={setSelectedProviders}
              onProjectsChange={setSelectedProjects}
              onAuthorsChange={setSelectedAuthors}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              disabled={loading}
            />
          </div>
        )}
      </div>

      {/* Results */}
      {searched && (
        <div className="relative">
          {/* Loading overlay with spinner */}
          {loading && (
            <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 z-10 flex items-center justify-center min-h-[200px]">
              <div className="flex flex-col items-center gap-3">
                <svg
                  className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Searching...
                </span>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {!loading && total === 0 ? (
              "No results found"
            ) : (
              <>
                Found <span className="font-medium">{total}</span> results
                {results.length < total && (
                  <span> (showing {results.length})</span>
                )}
              </>
            )}
          </div>

          {results.length > 0 && (
            <div className="space-y-3">
              {results.map((result, index) => (
                <SearchResultItem
                  key={`${result.providerId}-${result.sessionId}-${result.messageId}-${index}`}
                  result={result}
                />
              ))}
            </div>
          )}

          {/* Load More button */}
          {hasMore && !loading && (
            <div className="mt-6 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="px-6 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty state before search */}
      {!searched && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>Enter a search query to find messages across all your conversations.</p>
          <p className="text-sm mt-2">
            Tip: Use <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">*</code> as a wildcard. Example: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">*error*</code>
          </p>
        </div>
      )}
    </div>
  );
}
