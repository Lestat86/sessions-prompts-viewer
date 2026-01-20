import { ProviderId } from "./providers";

// Activity data for a single day
export interface DailyActivity {
  date: string; // YYYY-MM-DD format
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  byProvider: Partial<Record<ProviderId, {
    userMessages: number;
    assistantMessages: number;
  }>>;
}

// Aggregated statistics
export interface StatsAggregate {
  totalMessages: number;
  totalUserMessages: number;
  totalAssistantMessages: number;
  totalDays: number;
  averageMessagesPerDay: number;
  byProvider: Partial<Record<ProviderId, {
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
  }>>;
}

// Complete statistics data structure
export interface StatsData {
  dailyActivity: DailyActivity[];
  aggregate: StatsAggregate;
  providers: {
    id: ProviderId;
    name: string;
    icon: string;
  }[];
  dateRange: {
    start: string;
    end: string;
  };
}
