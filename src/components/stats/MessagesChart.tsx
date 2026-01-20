"use client";

import { useMemo, useState } from "react";
import { DailyActivity } from "@/types/stats";

interface Props {
  dailyActivity: DailyActivity[];
}

type TimeRange = "7d" | "30d" | "90d" | "all";

export default function MessagesChart({ dailyActivity }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { data, maxValue, labels } = useMemo(() => {
    // Filter data based on time range
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let cutoffDate: Date;

    switch (timeRange) {
      case "7d":
        cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
      case "30d":
        cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        break;
      case "90d":
        cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - 90);
        break;
      default:
        cutoffDate = new Date(0);
    }

    const cutoffStr = cutoffDate.toISOString().split("T")[0];
    const filtered = dailyActivity.filter((d) => d.date >= cutoffStr);

    // Sort by date
    const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));

    let max = 1;
    for (const day of sorted) {
      if (day.userMessages > max) max = day.userMessages;
    }

    // Generate labels (show first of each month, or every few days for short ranges)
    const labelData: { index: number; label: string }[] = [];
    let lastMonth = -1;
    sorted.forEach((day, idx) => {
      const date = new Date(day.date);
      const month = date.getMonth();
      if (timeRange === "7d") {
        labelData.push({
          index: idx,
          label: date.toLocaleDateString("en-US", { weekday: "short" }),
        });
      } else if (month !== lastMonth) {
        labelData.push({
          index: idx,
          label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        });
        lastMonth = month;
      }
    });

    return { data: sorted, maxValue: max, labels: labelData };
  }, [dailyActivity, timeRange]);

  const chartWidth = 600;
  const chartHeight = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Generate SVG path
  const points = data.map((day, idx) => {
    const x = padding.left + (idx / Math.max(data.length - 1, 1)) * innerWidth;
    const y = padding.top + innerHeight - (day.userMessages / maxValue) * innerHeight;
    return { x, y, data: day };
  });

  const linePath = points.length > 0
    ? `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`
    : "";

  const areaPath = points.length > 0
    ? `M ${padding.left},${padding.top + innerHeight} L ${points.map((p) => `${p.x},${p.y}`).join(" L ")} L ${padding.left + innerWidth},${padding.top + innerHeight} Z`
    : "";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          User Messages Over Time
        </h3>
        <div className="flex gap-1">
          {(["7d", "30d", "90d", "all"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                timeRange === range
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {range === "all" ? "All" : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
          No data for selected period
        </div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto"
            style={{ maxHeight: "200px" }}
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding.top + innerHeight * (1 - ratio);
              return (
                <g key={ratio}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + innerWidth}
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity={0.1}
                    className="text-gray-400 dark:text-gray-600"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-gray-400 dark:fill-gray-500 text-[10px]"
                  >
                    {Math.round(maxValue * ratio)}
                  </text>
                </g>
              );
            })}

            {/* X-axis labels */}
            {labels.map(({ index, label }) => {
              const x = padding.left + (index / Math.max(data.length - 1, 1)) * innerWidth;
              return (
                <text
                  key={`${index}-${label}`}
                  x={x}
                  y={chartHeight - 8}
                  textAnchor="middle"
                  className="fill-gray-400 dark:fill-gray-500 text-[10px]"
                >
                  {label}
                </text>
              );
            })}

            {/* Area fill */}
            <path
              d={areaPath}
              className="fill-blue-100 dark:fill-blue-900/30"
            />

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              strokeWidth={2}
              className="stroke-blue-500 dark:stroke-blue-400"
            />

            {/* Data points (interactive) */}
            {points.map((point, idx) => (
              <circle
                key={idx}
                cx={point.x}
                cy={point.y}
                r={hoveredIndex === idx ? 5 : 3}
                className={`fill-blue-500 dark:fill-blue-400 transition-all ${
                  hoveredIndex === idx ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}

            {/* Invisible hover targets */}
            {points.map((point, idx) => (
              <rect
                key={`hover-${idx}`}
                x={point.x - innerWidth / data.length / 2}
                y={padding.top}
                width={innerWidth / data.length}
                height={innerHeight}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              />
            ))}
          </svg>

          {/* Tooltip */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <div
              className="absolute bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-2 py-1 rounded shadow-lg pointer-events-none"
              style={{
                left: `${(points[hoveredIndex].x / chartWidth) * 100}%`,
                top: `${(points[hoveredIndex].y / chartHeight) * 100}%`,
                transform: "translate(-50%, -120%)",
              }}
            >
              <div className="font-medium">{points[hoveredIndex].data.date}</div>
              <div>{points[hoveredIndex].data.userMessages} messages</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
