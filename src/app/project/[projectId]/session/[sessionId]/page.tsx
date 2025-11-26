import Link from "next/link";
import { getSessionMessages, getSessions } from "@/lib/claude-reader";
import ChatView from "./ChatView";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ projectId: string; sessionId: string }>;
}

export default async function SessionPage({ params }: Props) {
  const { projectId, sessionId } = await params;
  const decodedProjectId = decodeURIComponent(projectId);

  const [messages, sessions] = await Promise.all([
    getSessionMessages(decodedProjectId, sessionId),
    getSessions(decodedProjectId),
  ]);

  const currentSession = sessions.find((s) => s.id === sessionId);
  const projectName = decodedProjectId.split("-").pop() || decodedProjectId;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-8 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm mb-2">
            <Link
              href="/"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Projects
            </Link>
            <span className="text-gray-400">/</span>
            <Link
              href={`/project/${encodeURIComponent(decodedProjectId)}`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {projectName}
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 dark:text-gray-400">Session</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 line-clamp-1">
            {currentSession?.title || "Session"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {messages.length} messages
            {currentSession && (
              <> &middot; {currentSession.lastModified.toLocaleString()}</>
            )}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <ChatView messages={messages} />
      </main>
    </div>
  );
}
