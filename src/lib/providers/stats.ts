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
  const availableProviders: { id: ProviderId; name: string; icon: string }[] = [];

  // Check availability in parallel
  const availabilityChecks = await Promise.all(
    providers.map(async ({ provider, id, name, icon }) => ({
      provider,
      id,
      name,
      icon,
      available: await provider.isAvailable(),
    }))
  );

  const activeProviders = availabilityChecks.filter((p) => p.available);
  for (const p of activeProviders) {
    availableProviders.push({ id: p.id, name: p.name, icon: p.icon });
  }

  // Process all providers in parallel
  const providerDailyMaps = await Promise.all(
    activeProviders.map(async ({ provider, id }) => {
      const dailyMap = new Map<string, DailyActivity>();
      const projects = await provider.getProjects();

      // Process all projects in parallel
      const projectMaps = await Promise.all(
        projects.map(async (project) => {
          const localMap = new Map<string, DailyActivity>();
          const sessions = await provider.getSessions(project.id);

          // Process all sessions in parallel
          const sessionMaps = await Promise.all(
            sessions.map(async (session) => {
              const sMap = new Map<string, DailyActivity>();
              const messages = await provider.getMessages(project.id, session.id);

              for (const message of messages) {
                const date = message.timestamp.toISOString().split("T")[0];
                const isUser = message.role === "user";
                const hasActualUserContent =
                  isUser &&
                  typeof message.content === "string" &&
                  message.content.trim().length > 0;

                let daily = sMap.get(date);
                if (!daily) {
                  daily = {
                    date,
                    totalMessages: 0,
                    userMessages: 0,
                    assistantMessages: 0,
                    byProvider: {},
                  };
                  sMap.set(date, daily);
                }

                if (hasActualUserContent) {
                  daily.totalMessages++;
                  daily.userMessages++;
                } else if (message.role === "assistant") {
                  daily.totalMessages++;
                  daily.assistantMessages++;
                }

                if (!daily.byProvider[id]) {
                  daily.byProvider[id] = { userMessages: 0, assistantMessages: 0 };
                }
                if (hasActualUserContent) {
                  daily.byProvider[id]!.userMessages++;
                } else if (message.role === "assistant") {
                  daily.byProvider[id]!.assistantMessages++;
                }
              }
              return sMap;
            })
          );

          // Merge session maps into project map
          for (const sMap of sessionMaps) {
            for (const [date, activity] of sMap) {
              const existing = localMap.get(date);
              if (existing) {
                existing.totalMessages += activity.totalMessages;
                existing.userMessages += activity.userMessages;
                existing.assistantMessages += activity.assistantMessages;
                for (const [pid, counts] of Object.entries(activity.byProvider) as [ProviderId, { userMessages: number; assistantMessages: number }][]) {
                  if (!existing.byProvider[pid]) {
                    existing.byProvider[pid] = { userMessages: 0, assistantMessages: 0 };
                  }
                  existing.byProvider[pid]!.userMessages += counts.userMessages;
                  existing.byProvider[pid]!.assistantMessages += counts.assistantMessages;
                }
              } else {
                localMap.set(date, { ...activity });
              }
            }
          }
          return localMap;
        })
      );

      // Merge project maps into provider map
      for (const pMap of projectMaps) {
        for (const [date, activity] of pMap) {
          const existing = dailyMap.get(date);
          if (existing) {
            existing.totalMessages += activity.totalMessages;
            existing.userMessages += activity.userMessages;
            existing.assistantMessages += activity.assistantMessages;
            for (const [pid, counts] of Object.entries(activity.byProvider) as [ProviderId, { userMessages: number; assistantMessages: number }][]) {
              if (!existing.byProvider[pid]) {
                existing.byProvider[pid] = { userMessages: 0, assistantMessages: 0 };
              }
              existing.byProvider[pid]!.userMessages += counts.userMessages;
              existing.byProvider[pid]!.assistantMessages += counts.assistantMessages;
            }
          } else {
            dailyMap.set(date, { ...activity });
          }
        }
      }

      return dailyMap;
    })
  );

  // Merge all provider maps
  const finalMap = new Map<string, DailyActivity>();
  for (const providerMap of providerDailyMaps) {
    for (const [date, activity] of providerMap) {
      const existing = finalMap.get(date);
      if (existing) {
        existing.totalMessages += activity.totalMessages;
        existing.userMessages += activity.userMessages;
        existing.assistantMessages += activity.assistantMessages;
        for (const [pid, counts] of Object.entries(activity.byProvider) as [ProviderId, { userMessages: number; assistantMessages: number }][]) {
          if (!existing.byProvider[pid]) {
            existing.byProvider[pid] = { userMessages: 0, assistantMessages: 0 };
          }
          existing.byProvider[pid]!.userMessages += counts.userMessages;
          existing.byProvider[pid]!.assistantMessages += counts.assistantMessages;
        }
      } else {
        finalMap.set(date, { ...activity });
      }
    }
  }

  // Convert to sorted array
  const dailyActivity = Array.from(finalMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
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
      aggregate.byProvider[pid]!.totalMessages +=
        counts.userMessages + counts.assistantMessages;
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
    start:
      dailyActivity.length > 0
        ? dailyActivity[0].date
        : new Date().toISOString().split("T")[0],
    end:
      dailyActivity.length > 0
        ? dailyActivity[dailyActivity.length - 1].date
        : new Date().toISOString().split("T")[0],
  };

  return {
    dailyActivity,
    aggregate,
    providers: availableProviders,
    dateRange,
  };
}
