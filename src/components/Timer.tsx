// src/components/Timer/Timer.tsx
import React, { useEffect, useState } from "react";
import { Task, TimerConfig, TimerState } from "@/types";
import { TaskService } from "@/lib/services/taskService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw, Coffee } from "lucide-react";
import { storage } from "@/db/local";

interface TimerProps {
  selectedTaskId?: string | null;
  onTaskComplete?: () => void;
}

export const Timer: React.FC<TimerProps> = ({
  selectedTaskId,
  onTaskComplete,
}) => {
  const [timerState, setTimerState] = useState<TimerState>({
    timeRemaining: 25 * 60,
    status: "idle",
    pomodorosCompleted: 0,
    currentTaskId: null,
  });
  const [progress, setProgress] = useState<number>(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [config, setConfig] = useState<TimerConfig>({
    pomoDuration: 25 * 60,
    shortBreakDuration: 5 * 60,
    longBreakDuration: 15 * 60,
    longBreakInterval: 4,
  });

  // Add this type guard function at the top level of your component
  const isTimerState = (value: unknown): value is TimerState => {
    return (
      typeof value === "object" &&
      value !== null &&
      "timeRemaining" in value &&
      "status" in value &&
      "pomodorosCompleted" in value &&
      "currentTaskId" in value
    );
  };

  // Helper function to safely send messages to background
  const sendMessageToBackground = async (message: any) => {
    try {
      return await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("Chrome runtime error:", chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
    } catch (error) {
      console.error("Failed to send message to background:", error);
      return null;
    }
  };

  // Helper function to safely connect to background
  const connectToBackground = () => {
    try {
      const port = chrome.runtime.connect({ name: "timer-port" });
      return port;
    } catch (error) {
      console.error("Failed to connect to background:", error);
      return null;
    }
  };

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const timerConfig = await storage.getTimerConfig();
        setConfig(timerConfig);

        // Safely send config change message
        await sendMessageToBackground({
          type: "CONFIG_CHANGED",
          config: timerConfig,
          currentStatus: timerState.status,
        });
      } catch (error) {
        console.error("Failed to load config:", error);
      }
    };

    loadConfig();

    const handleConfigChange = async (changes: any) => {
      if (changes.timerConfig) {
        const newConfig = changes.timerConfig.newValue;
        setConfig(newConfig);

        await sendMessageToBackground({
          type: "CONFIG_CHANGED",
          config: newConfig,
          currentStatus: timerState.status,
        });
      }
    };

    chrome.storage.onChanged.addListener(handleConfigChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleConfigChange);
    };
  }, [timerState.status]);

  const calculateProgress = (state: TimerState) => {
    let total;
    if (state.status === "break") {
      const isLongBreak =
        state.pomodorosCompleted % config.longBreakInterval === 0;
      total = isLongBreak
        ? config.longBreakDuration
        : config.shortBreakDuration;
    } else {
      total = config.pomoDuration;
    }
    return ((total - state.timeRemaining) / total) * 100;
  };

  useEffect(() => {
    const initializeTimer = async () => {
      try {
        // Load initial timer state
        const response = await sendMessageToBackground({
          type: "GET_TIMER_STATE",
        });
        if (response && isTimerState(response)) {
          setTimerState(response);
          setProgress(calculateProgress(response));
        }

        // Set up listener for timer updates
        const handleTimerUpdate = (message: any) => {
          if (message.type === "TIMER_UPDATE") {
            setTimerState(message.state);
            setProgress(calculateProgress(message.state));
          }
        };

        chrome.runtime.onMessage.addListener(handleTimerUpdate);

        // Keep connection alive
        const port = connectToBackground();

        return () => {
          chrome.runtime.onMessage.removeListener(handleTimerUpdate);
          if (port) port.disconnect();
        };
      } catch (error) {
        console.error("Failed to initialize timer:", error);
      }
    };

    initializeTimer();
  }, []);

  useEffect(() => {
    const loadTask = async () => {
      if (selectedTaskId) {
        const task = await storage.getTask(selectedTaskId);
        setSelectedTask(task || null);
      } else {
        setSelectedTask(null);
      }
    };
    loadTask();
  }, [selectedTaskId]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const handleStart = async () => {
    await sendMessageToBackground({
      type: "START_TIMER",
      taskId: selectedTaskId,
    });
  };

  const handlePause = async () => {
    await sendMessageToBackground({ type: "PAUSE_TIMER" });
  };

  const handleReset = async () => {
    await sendMessageToBackground({ type: "RESET_TIMER" });
  };

  const getTimerStatus = () => {
    if (timerState.status === "break") {
      const isLongBreak =
        timerState.pomodorosCompleted % config.longBreakInterval === 0;
      return isLongBreak ? "Long Break" : "Short Break";
    }
    return "Focus Time";
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl">Focus Timer</CardTitle>
          <Badge
            variant={timerState.status === "break" ? "secondary" : "default"}
            className="capitalize"
          >
            {getTimerStatus()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-6xl font-bold tabular-nums">
            {formatTime(timerState.timeRemaining)}
          </div>

          <Progress value={progress} className="w-full" />

          <div className="flex justify-center space-x-2">
            {timerState.status === "idle" && (
              <Button variant="default" size="lg" onClick={handleStart}>
                <Play className="mr-2 h-4 w-4" />
                Start
              </Button>
            )}

            {timerState.status === "running" && (
              <Button variant="secondary" size="lg" onClick={handlePause}>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
            )}

            {timerState.status === "paused" && (
              <Button variant="default" size="lg" onClick={handleStart}>
                <Play className="mr-2 h-4 w-4" />
                Resume
              </Button>
            )}

            {timerState.status !== "idle" && (
              <Button variant="outline" size="lg" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            )}
          </div>

          {timerState.status === "break" && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Coffee className="mr-2 h-4 w-4" />
              Take a well-deserved break!
            </div>
          )}

          {selectedTask && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">
                Current Task: {selectedTask.title}
              </Badge>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Pomodoros completed: {timerState.pomodorosCompleted}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
