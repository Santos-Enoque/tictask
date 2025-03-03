// src/types/index.ts
  export type TaskStatus = 'to_do' | 'in_progress' | 'completed';
  
  export interface DailyStats {
    date: string; // YYYY-MM-DD format
    pomodorosCompleted: number;
    totalFocusTime: number; // in seconds
    sessions: {
      completed: number;
      interrupted: number;
    };
    taskBreakdown: {
      [taskId: string]: {
        pomodorosCompleted: number;
        totalTime: number;
      };
    };
  }
  
export interface SyncQueue {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  type: 'task' | 'session' | 'config';
  data: any;
  timestamp: string;
} 
  export interface WeeklyStats {
    weekStart: string; // YYYY-MM-DD of week start
    weekEnd: string; // YYYY-MM-DD of week end
    pomodorosCompleted: number;
    totalFocusTime: number;
    bestDay: {
      date: string;
      pomodoros: number;
    };
    dailyBreakdown: {
      [date: string]: {
        pomodorosCompleted: number;
        totalTime: number;
      };
    };
  }
  
  export interface MonthlyStats {
    month: string; // YYYY-MM format
    pomodorosCompleted: number;
    totalFocusTime: number;
    bestDay: {
      date: string;
      pomodoros: number;
    };
    completionRate: number; // percentage of completed vs interrupted sessions
    weeklyBreakdown: {
      [weekStart: string]: {
        pomodorosCompleted: number;
        totalTime: number;
      };
    };
  }