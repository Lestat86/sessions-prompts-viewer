"use client";

import { useState, useMemo } from "react";
import { StatsData, DailyActivity, StatsAggregate } from "@/types/stats";
import { ProviderId } from "@/types/providers";
import StatsProviderFilter from "@/components/stats/StatsProviderFilter";
import SummaryStats from "@/components/stats/SummaryStats";
import ActivityHeatmap from "@/components/stats/ActivityHeatmap";
import MessagesChart from "@/components/stats/MessagesChart";

interface Props {
  data: StatsData;
}

export default function StatsClient({ data }: Props) {
  const [selectedProvider, setSelectedProvider] = useState<ProviderId | null>(null);

  // Filter data based on selected provider
  const filteredData = useMemo(() => {
    if (!selectedProvider) {
      return data;
    }

    // Filter daily activity
    const filteredDaily: DailyActivity[] = data.dailyActivity
      .map((day) => {
        const providerData = day.byProvider[selectedProvider];
        if (!providerData) {
          return null;
        }
        return {
          date: day.date,
          totalMessages: providerData.userMessages + providerData.assistantMessages,
          userMessages: providerData.userMessages,
          assistantMessages: providerData.assistantMessages,
          byProvider: { [selectedProvider]: providerData },
        };
      })
      .filter((day): day is DailyActivity => day !== null && day.totalMessages > 0);

    // Calculate filtered aggregates
    const filteredAggregate: StatsAggregate = {
      totalMessages: 0,
      totalUserMessages: 0,
      totalAssistantMessages: 0,
      totalDays: filteredDaily.length,
      averageMessagesPerDay: 0,
      byProvider: {},
    };

    for (const daily of filteredDaily) {
      filteredAggregate.totalMessages += daily.totalMessages;
      filteredAggregate.totalUserMessages += daily.userMessages;
      filteredAggregate.totalAssistantMessages += daily.assistantMessages;
    }

    if (filteredAggregate.totalDays > 0) {
      filteredAggregate.averageMessagesPerDay = Math.round(
        filteredAggregate.totalMessages / filteredAggregate.totalDays
      );
    }

    const providerAgg = data.aggregate.byProvider[selectedProvider];
    if (providerAgg) {
      filteredAggregate.byProvider[selectedProvider] = providerAgg;
    }

    return {
      ...data,
      dailyActivity: filteredDaily,
      aggregate: filteredAggregate,
    };
  }, [data, selectedProvider]);

  const handleProviderClick = (providerId: ProviderId) => {
    setSelectedProvider((current) => (current === providerId ? null : providerId));
  };

  return (
    <div className="space-y-6">
      <StatsProviderFilter
        providers={data.providers}
        aggregate={data.aggregate}
        selectedProvider={selectedProvider}
        onProviderClick={handleProviderClick}
      />

      <SummaryStats aggregate={filteredData.aggregate} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityHeatmap
          dailyActivity={filteredData.dailyActivity}
          dateRange={data.dateRange}
        />
        <MessagesChart dailyActivity={filteredData.dailyActivity} />
      </div>
    </div>
  );
}
