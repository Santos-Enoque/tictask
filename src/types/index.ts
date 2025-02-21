// src/types/index.ts
export interface Task {
    id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    createdAt: number;
    updatedAt: number;
    completedAt?: number;
    pomodorosCompleted: number;
    estimatedPomodoros?: number;
  }
  
  export type TaskStatus = 'pending' | 'in_progress' | 'completed';
  
  export interface TimerConfig {
    pomoDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    longBreakInterval: number;
  }
  
  export interface TimerSession {
    id: string;
    startTime: number;
    endTime: number;
    type: 'pomodoro' | 'short_break' | 'long_break';
    completed: boolean;
    taskId?: string | null;
  }
  
  export interface DailyStats {
    pomodorosCompleted: number;
    totalFocusTime: number;
  }