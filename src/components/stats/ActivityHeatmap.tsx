"use client";

import { useMemo } from "react";
import { DailyActivity } from "@/types/stats";

interface Props {
  dailyActivity: DailyActivity[];
  dateRange: { start: string; end: string };
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getIntensityClass(count: number, maxCount: number): string {
  if (count === 0) return "bg-gray-100 dark:bg-gray-800";
  const ratio = count / maxCount;
  if (ratio <= 0.25) return "bg-blue-200 dark:bg-blue-900";
  if (ratio <= 0.5) return "bg-blue-400 dark:bg-blue-700";
  if (ratio <= 0.75) return "bg-blue-500 dark:bg-blue-600";
  return "bg-blue-700 dark:bg-blue-500";
}

export default function ActivityHeatmap({ dailyActivity }: Props) {
  const { weeks, maxCount, monthLabels } = useMemo(() => {
    // Create a map of date -> activity
    const activityMap = new Map<string, number>();
    let max = 1;
    for (const day of dailyActivity) {
      activityMap.set(day.date, day.userMessages);
      if (day.userMessages > max) max = day.userMessages;
    }

    // Generate 52 weeks of data ending today
    const today = new Date();
    const endDate = new Date(today);
    endDate.setHours(0, 0, 0, 0);

    // Find the start date (52 weeks ago, aligned to Sunday)
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 363); // ~52 weeks
    // Align to Sunday
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const weeksData: { date: Date; count: number; dateStr: string }[][] = [];
    const months: { label: string; weekIndex: number }[] = [];
    let currentWeek: { date: Date; count: number; dateStr: string }[] = [];
    let lastMonth = -1;

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const count = activityMap.get(dateStr) || 0;

      // Track month changes for labels
      const month = currentDate.getMonth();
      if (month !== lastMonth) {
        months.push({ label: MONTHS[month], weekIndex: weeksData.length });
        lastMonth = month;
      }

      currentWeek.push({
        date: new Date(currentDate),
        count,
        dateStr,
      });

      // Start a new week on Sunday
      if (currentDate.getDay() === 6 || currentDate.getTime() === endDate.getTime()) {
        weeksData.push(currentWeek);
        currentWeek = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeksData.push(currentWeek);
    }

    return { weeks: weeksData, maxCount: max, monthLabels: months };
  }, [dailyActivity]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
        Activity Heatmap
      </h3>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex mb-1 ml-8">
            {monthLabels.map((month, idx) => (
              <div
                key={`${month.label}-${idx}`}
                className="text-xs text-gray-500 dark:text-gray-400"
                style={{
                  position: "relative",
                  left: `${month.weekIndex * 12}px`,
                  marginRight: idx < monthLabels.length - 1 ? "0" : "auto",
                }}
              >
                {month.label}
              </div>
            ))}
          </div>

          <div className="flex gap-0.5">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1">
              {DAYS_OF_WEEK.map((day, idx) => (
                <div
                  key={day}
                  className="h-[10px] text-[9px] text-gray-500 dark:text-gray-400 leading-[10px]"
                  style={{ visibility: idx % 2 === 1 ? "visible" : "hidden" }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex gap-0.5">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-0.5">
                  {DAYS_OF_WEEK.map((_, dayIdx) => {
                    const day = week.find((d) => d.date.getDay() === dayIdx);
                    if (!day) {
                      return (
                        <div
                          key={dayIdx}
                          className="w-[10px] h-[10px] rounded-sm bg-transparent"
                        />
                      );
                    }
                    return (
                      <div
                        key={dayIdx}
                        className={`w-[10px] h-[10px] rounded-sm ${getIntensityClass(
                          day.count,
                          maxCount
                        )} cursor-pointer transition-transform hover:scale-125`}
                        title={`${day.dateStr}: ${day.count} message${day.count !== 1 ? "s" : ""}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-1 mt-3 text-xs text-gray-500 dark:text-gray-400">
            <span>Less</span>
            <div className="w-[10px] h-[10px] rounded-sm bg-gray-100 dark:bg-gray-800" />
            <div className="w-[10px] h-[10px] rounded-sm bg-blue-200 dark:bg-blue-900" />
            <div className="w-[10px] h-[10px] rounded-sm bg-blue-400 dark:bg-blue-700" />
            <div className="w-[10px] h-[10px] rounded-sm bg-blue-500 dark:bg-blue-600" />
            <div className="w-[10px] h-[10px] rounded-sm bg-blue-700 dark:bg-blue-500" />
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
