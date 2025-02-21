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
import html2canvas from "html2canvas";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { storage } from "@/db/local";

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
        // Start from first day of current year
        startDate = new Date(
          today.getFullYear() - 1,
          today.getMonth(),
          today.getDate() + 1
        );
        gridSize = 371; // 53 weeks × 7 days to ensure we have complete weeks
        break;
    }

    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate: today, gridSize };
  };

  useEffect(() => {
    loadStats();
  }, [period]);

  const loadStats = async () => {
    const sessions = await storage.getSessionsByDateRange(
      getDateRange(period).startDate.toISOString(),
      getDateRange(period).endDate.toISOString()
    );

    const pomodoroSessions = sessions.filter(
      (s) => s.type === "pomodoro" && s.completed
    );

    // Group sessions by date
    const daily: DailyPomodoros = {};
    pomodoroSessions.forEach((session) => {
      const date = new Date(session.startTime).toISOString().split("T")[0];
      daily[date] = (daily[date] || 0) + 1;
    });

    // Calculate streak within the period
    let currentStreak = 0;
    let maxStreak = 0;
    let lastDate = new Date(getDateRange(period).endDate);

    while (lastDate >= getDateRange(period).startDate) {
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

  const exportAsImage = async () => {
    // Create a wrapper div for the export
    const exportWrapper = document.createElement("div");
    exportWrapper.className = "p-8 bg-background";

    // Add TicTask branding
    const brandingDiv = document.createElement("div");
    brandingDiv.className = "flex flex-col items-center gap-4 mb-4";
    brandingDiv.innerHTML = `
      <img src="/icon-2.png" alt="TicTask"  />

      <div class="text-center">
        This is how much I worked in ${
          period === "year"
            ? "this year"
            : period === "month"
            ? "this month"
            : "this week"
        } 🚀
      </div>
      <div class="text-center">
        <p class="text-muted-foreground">
          #no-days-off
        </p>
      </div>
    `;

    // Create stats summary
    const statsDiv = document.createElement("div");
    statsDiv.className = "grid grid-cols-3 gap-4 mb-8";
    statsDiv.innerHTML = `
      <div class="text-center">
        <div class="text-2xl font-bold">${totalPomodoros}</div>
        <div class="text-sm text-muted-foreground">Focus Sessions</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold">${streak}</div>
        <div class="text-sm text-muted-foreground">Best Streak</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold">${Math.max(
          ...Object.values(dailyPomodoros),
          0
        )}</div>
        <div class="text-sm text-muted-foreground">Best Day</div>
      </div>
    `;

    // Get the grid element and clone it
    const originalGrid = document.querySelector(".grid.gap-1");
    if (!originalGrid) return;

    const gridWrapper = document.createElement("div");
    gridWrapper.className = "space-y-2";

    const gridTitle = document.createElement("div");
    gridTitle.className = "text-sm font-medium mb-2";
    gridTitle.textContent = `${
      period === "year" ? "Yearly" : period === "month" ? "Monthly" : "Weekly"
    } Overview`;

    const gridClone = originalGrid.cloneNode(true);

    // Add the legend
    const legend = document.createElement("div");
    legend.className = "flex items-center justify-end space-x-2 mt-2";
    legend.innerHTML = `
      <div class="text-xs text-muted-foreground">Less</div>
      <div class="flex space-x-1">
        <div class="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800"></div>
        <div class="w-3 h-3 rounded-sm bg-green-100 dark:bg-green-300"></div>
        <div class="w-3 h-3 rounded-sm bg-green-300 dark:bg-green-400"></div>
        <div class="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-500"></div>
        <div class="w-3 h-3 rounded-sm bg-green-700 dark:bg-green-600"></div>
      </div>
      <div class="text-xs text-muted-foreground">More</div>
    `;

    gridWrapper.appendChild(gridTitle);
    gridWrapper.appendChild(gridClone);
    gridWrapper.appendChild(legend);

    // Append all elements to wrapper
    exportWrapper.appendChild(brandingDiv);
    exportWrapper.appendChild(statsDiv);
    exportWrapper.appendChild(gridWrapper);
    document.body.appendChild(exportWrapper);

    try {
      const canvas = await html2canvas(exportWrapper, {
        backgroundColor: null,
        scale: 2, // Higher quality
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "tictask-stats.png";
      link.href = image;
      link.click();
    } catch (error) {
      console.error("Failed to export stats:", error);
    }

    // Clean up
    document.body.removeChild(exportWrapper);
  };

  return (
    <Card id="stats-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Focus Statistics</CardTitle>
        <div className="flex items-center gap-2">
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
          <Button
            variant="outline"
            size="icon"
            onClick={exportAsImage}
            title="Export as image"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
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
