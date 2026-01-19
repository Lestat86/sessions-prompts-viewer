// Search feature types

import { ProviderId } from "./providers";

export interface SearchFilters {
  query: string;
  providers?: ProviderId[];
  projects?: string[]; // Project IDs
  authors?: ("user" | "assistant")[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

export interface SearchResult {
  providerId: ProviderId;
  providerName: string;
  providerIcon: string;
  projectId: string;
  projectName: string;
  sessionId: string;
  messageId: string;
  role: "user" | "assistant";
  timestamp: Date;
  snippet: string;
  matchStart: number;
  matchLength: number;
  url: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
}
