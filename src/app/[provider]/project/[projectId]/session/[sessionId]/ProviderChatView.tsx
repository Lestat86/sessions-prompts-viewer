"use client";

import { useState, useEffect } from "react";
import { ProviderMessage } from "@/types/providers";
import ProviderChatMessage from "@/components/ProviderChatMessage";

interface Props {
  messages: ProviderMessage[];
}

export default function ProviderChatView({ messages }: Props) {
  const [, setExpandAll] = useState(true);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Scroll to and highlight message when hash is present in URL
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#msg-")) {
      const messageId = hash.replace("#msg-", "");

      // Use RAF to defer the state update after the initial render
      requestAnimationFrame(() => {
        setHighlightedId(messageId);
      });

      // Scroll to the element after a brief delay to ensure render
      const scrollTimer = setTimeout(() => {
        const element = document.getElementById(`msg-${messageId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);

      // Remove highlight after animation
      const highlightTimer = setTimeout(() => {
        setHighlightedId(null);
      }, 3000);

      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(highlightTimer);
      };
    }
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-8 py-6">
      {/* Controls */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Showing {messages.length} messages
        </div>
        <button
          onClick={() => setExpandAll((prev) => !prev)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Toggle All
        </button>
      </div>

      {/* Messages */}
      <div className="space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            id={`msg-${message.id}`}
            className={`transition-all duration-500 ${
              highlightedId === message.id
                ? "ring-2 ring-yellow-400 dark:ring-yellow-600 rounded-lg"
                : ""
            }`}
          >
            <ProviderChatMessage message={message} />
          </div>
        ))}
      </div>

      {messages.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No messages in this session
        </div>
      )}
    </div>
  );
}
