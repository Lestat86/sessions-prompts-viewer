import { StatsData, DailyActivity, StatsAggregate } from "@/types/stats";
import { ProviderId } from "@/types/providers";
import { claudeProvider, codexProvider, codeProvider, opencodeProvider } from "./index";

const providers = [
  { provider: claudeProvider, id: "claude" as ProviderId, name: "Claude Code", icon: "C" },
  { provider: codexProvider, id: "codex" as ProviderId, name: "Codex CLI", icon: "X" },
  { provider: codeProvider, id: "code" as ProviderId, name: "Code", icon: "K" },
  { provider: opencodeProvider, id: "opencode" as ProviderId, name: "OpenCode", icon: "O" },
];

export async function getStatisticsData(): Promise<StatsData> {
  const dailyMap = new Map<string, DailyActivity>();
  const availableProviders: { id: ProviderId; name: string; icon: string }[] = [];

  // Iterate over all providers
  for (const { provider, id, name, icon } of providers) {
    const available = await provider.isAvailable();
    if (!available) continue;

    availableProviders.push({ id, name, icon });

    const projects = await provider.getProjects();

    for (const project of projects) {
      const sessions = await provider.getSessions(project.id);

      for (const session of sessions) {
        const messages = await provider.getMessages(project.id, session.id);

        for (const message of messages) {
          const date = message.timestamp.toISOString().split("T")[0];

          // Only count user messages that have actual typed content
          // (not just tool results which are automatic responses)
          const isUser = message.role === "user";
          const hasActualUserContent = isUser &&
            typeof message.content === "string" &&
            message.content.trim().length > 0;

          let daily = dailyMap.get(date);
          if (!daily) {
            daily = {
              date,
              totalMessages: 0,
              userMessages: 0,
              assistantMessages: 0,
              byProvider: {},
            };
            dailyMap.set(date, daily);
          }

          // Count all messages for total, but only actual user prompts for userMessages
          if (hasActualUserContent) {
            daily.totalMessages++;
            daily.userMessages++;
          } else if (message.role === "assistant") {
            daily.totalMessages++;
            daily.assistantMessages++;
          }
          // Skip user messages that are only tool results

          if (!daily.byProvider[id]) {
            daily.byProvider[id] = { userMessages: 0, assistantMessages: 0 };
          }
          if (hasActualUserContent) {
            daily.byProvider[id]!.userMessages++;
          } else if (message.role === "assistant") {
            daily.byProvider[id]!.assistantMessages++;
          }
        }
      }
    }
  }

  // Convert to sorted array
  const dailyActivity = Array.from(dailyMap.values()).sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  // Calculate aggregates
  const aggregate: StatsAggregate = {
    totalMessages: 0,
    totalUserMessages: 0,
    totalAssistantMessages: 0,
    totalDays: dailyActivity.length,
    averageMessagesPerDay: 0,
    byProvider: {},
  };

  for (const daily of dailyActivity) {
    aggregate.totalMessages += daily.totalMessages;
    aggregate.totalUserMessages += daily.userMessages;
    aggregate.totalAssistantMessages += daily.assistantMessages;

    for (const [providerId, counts] of Object.entries(daily.byProvider)) {
      const pid = providerId as ProviderId;
      if (!aggregate.byProvider[pid]) {
        aggregate.byProvider[pid] = {
          totalMessages: 0,
          userMessages: 0,
          assistantMessages: 0,
        };
      }
      aggregate.byProvider[pid]!.totalMessages += counts.userMessages + counts.assistantMessages;
      aggregate.byProvider[pid]!.userMessages += counts.userMessages;
      aggregate.byProvider[pid]!.assistantMessages += counts.assistantMessages;
    }
  }

  if (aggregate.totalDays > 0) {
    aggregate.averageMessagesPerDay = Math.round(
      aggregate.totalMessages / aggregate.totalDays
    );
  }

  // Date range
  const dateRange = {
    start: dailyActivity.length > 0 ? dailyActivity[0].date : new Date().toISOString().split("T")[0],
    end: dailyActivity.length > 0 ? dailyActivity[dailyActivity.length - 1].date : new Date().toISOString().split("T")[0],
  };

  return {
    dailyActivity,
    aggregate,
    providers: availableProviders,
    dateRange,
  };
}
