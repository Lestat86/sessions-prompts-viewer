import { NextRequest, NextResponse } from "next/server";
import { searchMessages } from "@/lib/providers/search";
import { SearchFilters } from "@/types/search";
import { ProviderId } from "@/types/providers";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Parse query parameters
  const query = searchParams.get("q") || "";
  const providersParam = searchParams.get("providers");
  const projectsParam = searchParams.get("projects");
  const authorsParam = searchParams.get("authors");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  // Build filters
  const filters: SearchFilters = {
    query: query.trim(),
  };

  if (providersParam) {
    filters.providers = providersParam.split(",").filter(Boolean) as ProviderId[];
  }

  if (projectsParam) {
    filters.projects = projectsParam.split(",").filter(Boolean);
  }

  if (authorsParam) {
    filters.authors = authorsParam.split(",").filter(Boolean) as ("user" | "assistant")[];
  }

  if (fromParam || toParam) {
    filters.dateRange = {};
    if (fromParam) {
      filters.dateRange.from = new Date(fromParam);
    }
    if (toParam) {
      filters.dateRange.to = new Date(toParam);
    }
  }

  const limit = limitParam ? parseInt(limitParam, 10) : 50;
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

  try {
    const response = await searchMessages(filters, limit, offset);

    // Serialize dates for JSON response
    const serializedResults = response.results.map((result) => ({
      ...result,
      timestamp: result.timestamp.toISOString(),
    }));

    return NextResponse.json({
      results: serializedResults,
      total: response.total,
      hasMore: response.hasMore,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
