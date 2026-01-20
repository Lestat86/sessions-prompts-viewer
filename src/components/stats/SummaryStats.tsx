"use client";

import { StatsAggregate } from "@/types/stats";

interface Props {
  aggregate: StatsAggregate;
}

export default function SummaryStats({ aggregate }: Props) {
  const stats = [
    {
      label: "Total Messages",
      value: aggregate.totalMessages.toLocaleString(),
      description: "All messages across providers",
    },
    {
      label: "User Messages",
      value: aggregate.totalUserMessages.toLocaleString(),
      description: "Messages sent by you",
    },
    {
      label: "Assistant Messages",
      value: aggregate.totalAssistantMessages.toLocaleString(),
      description: "Responses from AI",
    },
    {
      label: "Active Days",
      value: aggregate.totalDays.toLocaleString(),
      description: "Days with activity",
    },
    {
      label: "Avg. Messages/Day",
      value: aggregate.averageMessagesPerDay.toLocaleString(),
      description: "Average daily activity",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
        >
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stat.value}
          </div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
            {stat.label}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {stat.description}
          </div>
        </div>
      ))}
    </div>
  );
}
