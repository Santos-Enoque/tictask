// src/components/Stats/Stats.tsx
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimerSession } from "@/types";

type TimePeriod = "week" | "month" | "year";

interface DailyPomodoros {
  [date: string]: number;
}

export const Stats: React.FC = () => {
  const [dailyPomodoros, setDailyPomodoros] = useState<DailyPomodoros>({});
  const [totalPomodoros, setTotalPomodoros] = useState(0);
  const [streak, setStreak] = useState(0);
  const [period, setPeriod] = useState<TimePeriod>("month");

  const getDateRange = (period: TimePeriod) => {
    const today = new Date();
    let startDate = new Date();
    let gridSize: number;

    switch (period) {
      case "week":
        // Start from Monday of current week
        startDate.setDate(
          today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)
        );
        gridSize = 7;
        break;
      case "month":
        // Start from first day of current month
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        gridSize = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0
        ).getDate();
        break;
      case "year":
        // Start from one year ago
        startDate.setFullYear(today.getFullYear() - 1);
        gridSize = 365;
        break;
    }

    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate: today, gridSize };
  };

  useEffect(() => {
    loadStats();
  }, [period]);

  const loadStats = async () => {
    const { sessions = [] } = await chrome.storage.local.get("sessions");
    const { startDate, endDate } = getDateRange(period);

    const pomodoroSessions = sessions.filter((s: TimerSession) => {
      const sessionDate = new Date(s.startTime);
      return (
        s.type === "pomodoro" &&
        s.completed &&
        sessionDate >= startDate &&
        sessionDate <= endDate
      );
    });

    // Group sessions by date
    const daily: DailyPomodoros = {};
    pomodoroSessions.forEach((session: TimerSession) => {
      const date = new Date(session.startTime).toISOString().split("T")[0];
      daily[date] = (daily[date] || 0) + 1;
    });

    // Calculate streak within the period
    let currentStreak = 0;
    let maxStreak = 0;
    let lastDate = new Date(endDate);

    while (lastDate >= startDate) {
      const dateStr = lastDate.toISOString().split("T")[0];
      if (daily[dateStr]) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
      lastDate.setDate(lastDate.getDate() - 1);
    }

    setDailyPomodoros(daily);
    setTotalPomodoros(
      Object.values(daily).reduce((sum, count) => sum + count, 0)
    );
    setStreak(maxStreak);
  };

  const getIntensityClass = (count: number) => {
    if (count === 0) return "bg-gray-100 dark:bg-gray-800";
    if (count >= 8) return "bg-green-700 dark:bg-green-600";
    if (count >= 4) return "bg-green-500 dark:bg-green-500";
    if (count >= 2) return "bg-green-300 dark:bg-green-400";
    return "bg-green-100 dark:bg-green-300";
  };

  const generateCells = () => {
    const { startDate, gridSize } = getDateRange(period);
    const cells = [];

    for (let i = 0; i < gridSize; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      cells.push({ date: dateStr, count: dailyPomodoros[dateStr] || 0 });
    }

    return cells;
  };

  const gridColumns = {
    week: "grid-cols-7",
    month: "grid-cols-7",
    year: "grid-cols-7",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Focus Statistics</CardTitle>
        <Select
          value={period}
          onValueChange={(value: TimePeriod) => setPeriod(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{totalPomodoros}</div>
            <div className="text-sm text-muted-foreground">
              {period === "year"
                ? "Yearly"
                : period === "month"
                ? "Monthly"
                : "Weekly"}{" "}
              Pomodoros
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{streak}</div>
            <div className="text-sm text-muted-foreground">Best Streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {Math.max(...Object.values(dailyPomodoros), 0)}
            </div>
            <div className="text-sm text-muted-foreground">Best Day</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">
            {period === "year"
              ? "Yearly"
              : period === "month"
              ? "Monthly"
              : "Weekly"}{" "}
            Overview
          </div>
          <div
            className={`grid gap-1 ${
              period === "year"
                ? "grid-flow-col grid-rows-7 auto-cols-fr"
                : gridColumns[period]
            }`}
          >
            {generateCells().map((cell) => (
              <div
                key={cell.date}
                className={`w-3 h-3 rounded-sm ${getIntensityClass(
                  cell.count
                )}`}
                title={`${new Date(cell.date).toLocaleDateString()}: ${
                  cell.count
                } pomodoros`}
              />
            ))}
          </div>
          <div className="flex items-center justify-end space-x-2 mt-2">
            <div className="text-xs text-muted-foreground">Less</div>
            <div className="flex space-x-1">
              <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
              <div className="w-3 h-3 rounded-sm bg-green-100 dark:bg-green-300" />
              <div className="w-3 h-3 rounded-sm bg-green-300 dark:bg-green-400" />
              <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-500" />
              <div className="w-3 h-3 rounded-sm bg-green-700 dark:bg-green-600" />
            </div>
            <div className="text-xs text-muted-foreground">More</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
