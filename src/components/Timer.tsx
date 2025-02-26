// src/components/Timer.tsx
import React, { useEffect, useState } from "react";
// import { Task, TimerConfig, TimerState } from "@/types";
import { Task, TimerConfig, TimerStateDB } from "@/db/schema";
import { TaskService } from "@/lib/services/taskService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw, Coffee } from "lucide-react";
import { storage } from "@/db/local";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimerProps {
  selectedTaskId?: string | null;
  onTaskComplete?: () => void;
}

export const Timer: React.FC<TimerProps> = ({
  selectedTaskId,
  onTaskComplete,
}) => {
  const [timerState, setTimerState] = useState<TimerStateDB>({
    id: "default",
    timeRemaining: 25 * 60,
    status: "idle",
    pomodorosCompleted: 0,
    currentTaskId: null,
    lastUpdateTime: Date.now(),
    timerMode: "focus",
  });
  const [progress, setProgress] = useState<number>(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [config, setConfig] = useState<TimerConfig >({
    id: "default",
    pomoDuration: 25 * 60,
    shortBreakDuration: 5 * 60,
    longBreakDuration: 15 * 60,
    longBreakInterval: 4,
  });
  const [tasks, setTasks] = useState<Task[]>([]);

  // Add this type guard function at the top level of your component
  const isTimerState = (value: unknown): value is TimerStateDB => {
    return (
      typeof value === "object" &&
      value !== null &&
      "timeRemaining" in value &&
      "status" in value &&
      "pomodorosCompleted" in value &&
      "currentTaskId" in value &&
      "timerMode" in value
    );
  };

  // Helper function to safely send messages to background
  const sendMessageToBackground = async (message: any) => {
    try {
      return await new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            console.debug(
              "Chrome runtime message not delivered:",
              chrome.runtime.lastError.message
            );
            resolve(null);
          } else {
            resolve(response);
          }
        });
      });
    } catch (error) {
      console.debug("Failed to send message to background:", error);
      return null;
    }
  };

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const timerConfig = await storage.getTimerConfig();
        console.log("timerConfig", timerConfig);
        setConfig(timerConfig);

        // Get current timer state
        const currentState = await storage.getTimerState();

        // Only reset timer if idle
        if (currentState.status === "idle") {
          const newState = {
            ...currentState,
            timeRemaining: timerConfig.pomoDuration,
          };
          setTimerState(newState);
          setProgress(0);
        } else {
          // Recalculate progress with new config
          setProgress(await calculateProgress(currentState));
        }

        // Safely send config change message
        await sendMessageToBackground({
          type: "CONFIG_CHANGED",
          config: timerConfig,
          currentStatus: currentState.status,
        });
      } catch (error) {
        console.error("Failed to load config:", error);
      }
    };

    loadConfig();

    // Set up a message listener for config changes
    const handleConfigChange = async (message: any) => {
      if (message.type === "CONFIG_CHANGED") {
        const [newConfig, newState] = await Promise.all([
          storage.getTimerConfig(),
          storage.getTimerState(),
        ]);

        setConfig(newConfig);
        setTimerState(newState);
        setProgress(await calculateProgress(newState));
      }
    };

    chrome.runtime.onMessage.addListener(handleConfigChange);
    return () => {
      chrome.runtime.onMessage.removeListener(handleConfigChange);
    };
  }, []);

  useEffect(() => {
    const initializeTimer = async () => {
      try {
        // Load initial timer state
        const response = await sendMessageToBackground({
          type: "GET_TIMER_STATE",
        });
        console.log("running initializeTimer");
        console.log("response", response);
        if (response && isTimerState(response)) {
          setTimerState(response);
          setProgress(await calculateProgress(response));

          // Load the task if there's a currentTaskId in the timer state
          if (response.currentTaskId) {
            const task = await storage.getTask(response.currentTaskId);
            setSelectedTask(task || null);
          }
        }

        // Set up listener for timer updates
        const handleTimerUpdate = async (message: any) => {
          if (message.type === "TIMER_UPDATE") {
            console.log("running handleTimerUpdate");
            console.log("message", message);
            setTimerState(message.state);
            setProgress(await calculateProgress(message.state));

            // Update selected task when timer state changes
            if (message.state.currentTaskId) {
              const task = await storage.getTask(message.state.currentTaskId);
              setSelectedTask(task || null);
            } else {
              setSelectedTask(null);
            }
          }
        };

        chrome.runtime.onMessage.addListener(handleTimerUpdate);

        return () => {
          chrome.runtime.onMessage.removeListener(handleTimerUpdate);
        };
      } catch (error) {
        console.error("Failed to initialize timer:", error);
      }
    };

    initializeTimer();
  }, []);

  // Add this effect to load tasks
  useEffect(() => {
    const loadTasks = async () => {
      const taskService = TaskService.getInstance();
      const allTasks = await taskService.getAllTasks();
      setTasks(allTasks.filter((task) => task.status !== "completed"));

      // Load current task from timer state
      const timerState = await storage.getTimerState();
      if (timerState.currentTaskId) {
        const currentTask = await storage.getTask(timerState.currentTaskId);
        if (currentTask) {
          setSelectedTask(currentTask);
        }
      }
    };
    loadTasks();
  }, []);

  const calculateProgress = async (state: TimerStateDB) => {
    //TODO - this is a hack to get the progress to work ! not ideal
    const config = await storage.getTimerConfig();

    // If timer hasn't started (idle state), progress should be 0
    if (state.status === "idle") {
      return 0;
    }

    let total;
    // Use the timerMode property to determine the correct total duration
    if (state.timerMode === "break" || state.status === "break") {
      const isLongBreak =
        state.pomodorosCompleted % config.longBreakInterval === 0;
      total = isLongBreak
        ? config.longBreakDuration
        : config.shortBreakDuration;
    } else {
      console.log("config.pomoDuration", config);
      total = config.pomoDuration;
      console.log("total", total);
    }

    // Ensure we have valid numbers
    if (!total || total <= 0) {
      console.warn("Invalid total duration:", total);
      return 0;
    }

    // Calculate progress as a percentage of time elapsed
    const elapsed = total - state.timeRemaining;
    const progress = (elapsed / total) * 100;

    // Ensure progress is between 0 and 100
    return Math.min(Math.max(progress, 0), 100);
  };
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
    if (timerState.timerMode === "break" || timerState.status === "break") {
      const isLongBreak =
        timerState.pomodorosCompleted % config.longBreakInterval === 0;
      return isLongBreak ? "Long Break" : "Short Break";
    }
    return "Focus Time";
  };

  // Add task selection handler
  const handleTaskSelect = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setSelectedTask(task);
      await sendMessageToBackground({
        type: "START_TIMER",
        taskId: task.id,
      });
    }
  };

  const isTimerActive =
    timerState.status === "running" || timerState.status === "paused";

  // Add new handlers for break
  const handleStartBreak = async () => {
    await sendMessageToBackground({
      type: "START_BREAK",
    });
  };

  const handleSkipBreak = async () => {
    await sendMessageToBackground({
      type: "SKIP_BREAK",
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl">Focus Timer</CardTitle>
          <Badge
            variant={
              timerState.timerMode === "break" || timerState.status === "break"
                ? "secondary"
                : "default"
            }
            className="capitalize"
          >
            {getTimerStatus()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
          {timerState.status !== "break" && (
            <Select
              disabled={isTimerActive}
              value={selectedTask?.id || ""}
              onValueChange={handleTaskSelect}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a task...">
                  {selectedTask?.title || "Select a task..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

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

            {/* Break controls */}
            {timerState.status === "break" && (
              <div className="flex space-x-2">
                {timerState.timeRemaining === config.shortBreakDuration ||
                timerState.timeRemaining === config.longBreakDuration ? (
                  // Break not started yet
                  <>
                    <Button
                      variant="default"
                      size="lg"
                      onClick={handleStartBreak}
                    >
                      <Coffee className="mr-2 h-4 w-4" />
                      Start Break
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={handleSkipBreak}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Skip Break
                    </Button>
                  </>
                ) : (
                  // Break in progress
                  <>
                    <Button variant="secondary" size="lg" onClick={handlePause}>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause Break
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleSkipBreak}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Skip Break
                    </Button>
                  </>
                )}
              </div>
            )}

            {timerState.status !== "idle" && timerState.status !== "break" && (
              <Button variant="outline" size="lg" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            )}
          </div>

          {timerState.status === "break" && timerState.timeRemaining > 0 && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Coffee className="mr-2 h-4 w-4" />
              Take a well-deserved break!
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
