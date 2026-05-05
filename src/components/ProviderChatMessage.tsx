"use client";

import { useState } from "react";
import { ProviderMessage } from "@/types/providers";
import CopyButton from "./CopyButton";

interface Props {
  message: ProviderMessage;
}

export default function ProviderChatMessage({ message }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showThinking, setShowThinking] = useState(false);
  const [showToolDetails, setShowToolDetails] = useState(false);

  const isUser = message.role === "user";
  const hasThinking = !!message.thinking;
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
  const hasToolResults = message.toolResults && message.toolResults.length > 0;
  const isToolResultMessage = isUser && hasToolResults;

  const copyText = buildCopyText(message);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        } ${
          isToolResultMessage
            ? "bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600"
            : ""
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-4 py-2 cursor-pointer ${
            isUser
              ? "border-b border-blue-500"
              : "border-b border-gray-200 dark:border-gray-700"
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium ${
                isUser ? "text-blue-200" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {isToolResultMessage ? "Tool Result" : isUser ? "User" : "Assistant"}
            </span>
            <span
              className={`text-xs ${
                isUser ? "text-blue-200" : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CopyButton
              text={copyText}
              title="Copy message to clipboard"
              className={
                isUser
                  ? "text-blue-200 hover:text-white"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }
            />
            <button
              className={`text-xs ${
                isUser ? "text-blue-200" : "text-gray-400 dark:text-gray-500"
              } hover:underline`}
            >
              {isExpanded ? "▼ Collapse" : "▶ Expand"}
            </button>
          </div>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="px-4 py-3">
            {/* Thinking */}
            {hasThinking && (
              <div className="mb-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowThinking(!showThinking);
                  }}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                >
                  {showThinking ? "▼" : "▶"} Thinking
                </button>
                {showThinking && (
                  <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded text-sm text-purple-800 dark:text-purple-200 whitespace-pre-wrap font-mono text-xs">
                    {message.thinking}
                  </div>
                )}
              </div>
            )}

            {/* Main content */}
            {message.content && (
              <div
                className={`whitespace-pre-wrap break-words ${
                  isUser ? "text-white" : "text-gray-900 dark:text-gray-100"
                }`}
              >
                <FormattedContent content={message.content} />
              </div>
            )}

            {/* Tool calls */}
            {hasToolCalls && (
              <div className="mt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowToolDetails(!showToolDetails);
                  }}
                  className="text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                >
                  {showToolDetails ? "▼" : "▶"} Tool Calls (
                  {message.toolCalls!.length})
                </button>
                {showToolDetails && (
                  <div className="mt-2 space-y-2">
                    {message.toolCalls!.map((tool, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-xs"
                      >
                        <div className="font-medium text-orange-800 dark:text-orange-200">
                          {tool.name}
                        </div>
                        <pre className="mt-1 text-orange-700 dark:text-orange-300 overflow-x-auto">
                          {JSON.stringify(tool.input, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tool results */}
            {hasToolResults && (
              <div className="space-y-2">
                {message.toolResults!.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded text-xs ${
                      result.isError
                        ? "bg-red-50 dark:bg-red-900/20"
                        : "bg-green-50 dark:bg-green-900/20"
                    }`}
                  >
                    <pre
                      className={`overflow-x-auto whitespace-pre-wrap ${
                        result.isError
                          ? "text-red-800 dark:text-red-200"
                          : "text-green-800 dark:text-green-200"
                      }`}
                    >
                      {result.content
                        ? result.content.slice(0, 1000)
                        : "(no content)"}
                      {result.content && result.content.length > 1000 && "..."}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function buildCopyText(message: ProviderMessage): string {
  const parts: string[] = [];
  if (message.content) parts.push(message.content);
  if (message.thinking) parts.push(`[Thinking]\n${message.thinking}`);
  if (message.toolCalls && message.toolCalls.length > 0) {
    parts.push(
      message.toolCalls
        .map((t) => `[Tool Call: ${t.name}]\n${JSON.stringify(t.input, null, 2)}`)
        .join("\n\n")
    );
  }
  if (message.toolResults && message.toolResults.length > 0) {
    parts.push(
      message.toolResults
        .map(
          (r) =>
            `[Tool Result${r.isError ? " (error)" : ""}]\n${
              r.content || "(no content)"
            }`
        )
        .join("\n\n")
    );
  }
  return parts.join("\n\n");
}

function FormattedContent({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        if (line.startsWith("## ")) {
          return (
            <h3 key={idx} className="font-bold text-lg mt-4">
              {line.slice(3)}
            </h3>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <h2 key={idx} className="font-bold text-xl mt-4">
              {line.slice(2)}
            </h2>
          );
        }
        if (line.includes("**")) {
          const parts = line.split(/\*\*([^*]+)\*\*/g);
          return (
            <p key={idx}>
              {parts.map((part, i) =>
                i % 2 === 1 ? (
                  <strong key={i}>{part}</strong>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </p>
          );
        }
        if (line.startsWith("```")) {
          return null;
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <li key={idx} className="ml-4">
              {line.slice(2)}
            </li>
          );
        }
        if (line.trim()) {
          return <p key={idx}>{line}</p>;
        }
        return <br key={idx} />;
      })}
    </div>
  );
}
