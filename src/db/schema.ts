export const DB_SCHEMA = {
  tasks: 'tasks',
  sessions: 'sessions',
  timerConfig: 'timerConfig',
  timerState: 'timerState',
  syncQueue: 'syncQueue'
};

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'to_do' | 'in_progress' | 'completed';
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  pomodorosCompleted: number;
  estimatedPomodoros?: number;
  dueDate: number;
  ongoing: boolean;
}

export interface TimerStateDB {
  id: string;
  timeRemaining: number;
  status: 'idle' | 'running' | 'paused' | 'break';
  pomodorosCompleted: number;
  currentTaskId: string | null;
  lastUpdateTime: number;
  timerMode: 'focus' | 'break'; // New property
}

export interface TimerSession {
  id: string;
  startTime: number;
  endTime: number;
  type: 'pomodoro' | 'short_break' | 'long_break';
  completed: boolean;
  taskId?: string | null;
  date: string;
  duration: number;
}

export interface TimerConfig {
  id: string;
  pomoDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
}

export interface SyncQueue {
    id: string;
    operation: 'CREATE' | 'UPDATE' | 'DELETE';
    type: 'task' | 'session' | 'config';
    data: any;
    timestamp: string;
  }

  export const DEFAULT_VALUES = {
    timerState: {
      id: 'default',
      timeRemaining: 25 * 60, // 25 minutes in seconds
      status: 'idle' as 'idle',
      pomodorosCompleted: 0,
      currentTaskId: null,
      lastUpdateTime: Date.now(),
      timerMode: 'focus' as 'focus'
    },
    timerConfig: {
      id: 'default',
      pomoDuration: 25 * 60, // 25 minutes in seconds
      shortBreakDuration: 5 * 60, // 5 minutes in seconds
      longBreakDuration: 15 * 60, // 15 minutes in seconds
      longBreakInterval: 4 // After 4 pomodoros, take a long break
    }
  };
  