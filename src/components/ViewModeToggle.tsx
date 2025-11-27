"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type ViewMode = "tools" | "projects";

export default function ViewModeToggle() {
  const pathname = usePathname();

  // Determine current mode from URL
  const currentMode: ViewMode = pathname.startsWith("/projects") ? "projects" : "tools";

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      <Link
        href="/projects"
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          currentMode === "projects"
            ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        }`}
      >
        By Project
      </Link>
      <Link
        href="/"
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          currentMode === "tools"
            ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        }`}
      >
        By Tool
      </Link>
    </div>
  );
}
