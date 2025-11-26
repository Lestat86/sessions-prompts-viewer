"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProviderInfo, ProviderId } from "@/types/providers";

interface Props {
  providers: ProviderInfo[];
  currentProvider: ProviderId;
}

export default function ProviderTabs({ providers, currentProvider }: Props) {
  const pathname = usePathname();

  // Determine base path (remove provider-specific parts)
  const getProviderUrl = (providerId: ProviderId) => {
    if (pathname === "/" || pathname.startsWith(`/${currentProvider}`)) {
      return `/${providerId}`;
    }
    return `/${providerId}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50">
      <div className="max-w-4xl mx-auto">
        <nav className="flex">
          {providers.map((provider) => {
            const isActive = currentProvider === provider.id;
            const isDisabled = !provider.available;

            return (
              <Link
                key={provider.id}
                href={isDisabled ? "#" : getProviderUrl(provider.id)}
                className={`flex-1 flex flex-col items-center py-3 px-2 text-sm transition-colors ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400 border-t-2 border-blue-600 dark:border-blue-400 -mt-[2px]"
                    : isDisabled
                    ? "text-gray-300 dark:text-gray-700 cursor-not-allowed"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
                onClick={(e) => {
                  if (isDisabled) {
                    e.preventDefault();
                  }
                }}
              >
                <span
                  className={`w-8 h-8 flex items-center justify-center rounded-full mb-1 text-lg font-bold ${
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                      : isDisabled
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-700"
                      : "bg-gray-100 dark:bg-gray-800"
                  }`}
                >
                  {provider.icon}
                </span>
                <span className="font-medium">{provider.name}</span>
                {isDisabled && (
                  <span className="text-xs text-gray-400 dark:text-gray-600">
                    Not found
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
