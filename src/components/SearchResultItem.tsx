"use client";

import Link from "next/link";

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
  result: SearchResultData;
}

export default function SearchResultItem({ result }: Props) {
  // Render snippet with highlighted match
  const renderSnippet = () => {
    const before = result.snippet.slice(0, result.matchStart);
    const match = result.snippet.slice(
      result.matchStart,
      result.matchStart + result.matchLength
    );
    const after = result.snippet.slice(result.matchStart + result.matchLength);

    return (
      <span>
        {before}
        <mark className="bg-yellow-200 dark:bg-yellow-800 text-gray-900 dark:text-gray-100 px-0.5 rounded">
          {match}
        </mark>
        {after}
      </span>
    );
  };

  const formattedDate = new Date(result.timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link href={result.url} className="block">
      <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all">
        {/* Header: Provider icon + breadcrumb */}
        <div className="flex items-center gap-2 mb-2">
          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold">
            {result.providerIcon}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {result.providerName}
          </span>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
            {result.projectName}
          </span>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 truncate font-mono">
            {result.sessionId.slice(0, 8)}...
          </span>
        </div>

        {/* Author badge and timestamp */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded ${
              result.role === "user"
                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            {result.role === "user" ? "User" : "Assistant"}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formattedDate}
          </span>
        </div>

        {/* Snippet with highlighted match */}
        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
          {renderSnippet()}
        </p>
      </div>
    </Link>
  );
}
