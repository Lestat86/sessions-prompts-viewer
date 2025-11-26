"use client";

import { useState } from "react";
import { ChatMessage as ChatMessageType } from "@/types/claude";
import ChatMessage from "@/components/ChatMessage";

interface Props {
  messages: ChatMessageType[];
}

export default function ChatView({ messages }: Props) {
  const [expandAll, setExpandAll] = useState(true);

  return (
    <div className="max-w-6xl mx-auto px-8 py-6">
      {/* Controls */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Showing {messages.length} messages
        </div>
        <button
          onClick={() => setExpandAll(!expandAll)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {expandAll ? "Collapse All" : "Expand All"}
        </button>
      </div>

      {/* Messages */}
      <div className="space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
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
