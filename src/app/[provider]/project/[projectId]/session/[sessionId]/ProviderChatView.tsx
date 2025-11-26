"use client";

import { useState } from "react";
import { ProviderMessage } from "@/types/providers";
import ProviderChatMessage from "@/components/ProviderChatMessage";

interface Props {
  messages: ProviderMessage[];
}

export default function ProviderChatView({ messages }: Props) {
  const [, setExpandAll] = useState(true);

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
          <ProviderChatMessage key={message.id} message={message} />
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
