import { TimerConfig } from "./timerService";

// src/lib/services/storageService.ts
export interface TimerSession {
    id: string;
    startTime: number;
    endTime: number;
    type: 'pomodoro' | 'short_break' | 'long_break';
    completed: boolean;
  }
  
  export interface DailyStats {
    pomodorosCompleted: number;
    totalFocusTime: number;
  }
  
  export class StorageService {
    private static instance: StorageService;
  
    private constructor() {}
  
    static getInstance(): StorageService {
      if (!StorageService.instance) {
        StorageService.instance = new StorageService();
      }
      return StorageService.instance;
    }
  
    async saveSession(session: TimerSession): Promise<void> {
      const { sessions } = await chrome.storage.local.get('sessions');
      const updatedSessions = [...(sessions || []), session];
      await chrome.storage.local.set({ sessions: updatedSessions });
    }
  
    async getDailySessions(date: string): Promise<TimerSession[]> {
      const { sessions } = await chrome.storage.local.get('sessions');
      if (!sessions) return [];
  
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
  
      return sessions.filter((session: TimerSession) => {
        const sessionDate = new Date(session.startTime);
        return sessionDate >= startOfDay && sessionDate <= endOfDay;
      });
    }
  
    async getDailyStats(date: string): Promise<DailyStats> {
      const sessions = await this.getDailySessions(date);
      
      return sessions.reduce((stats: DailyStats, session: TimerSession) => {
        if (session.completed && session.type === 'pomodoro') {
          stats.pomodorosCompleted++;
          stats.totalFocusTime += (session.endTime - session.startTime) / 1000; // Convert to seconds
        }
        return stats;
      }, {
        pomodorosCompleted: 0,
        totalFocusTime: 0
      });
    }
  
    async saveTimerConfig(config: TimerConfig): Promise<void> {
      await chrome.storage.sync.set({ timerConfig: config });
    }
  
    async getTimerConfig(): Promise<TimerConfig> {
      const { timerConfig } = await chrome.storage.sync.get('timerConfig');
      return timerConfig || {
        pomoDuration: 25 * 60,
        shortBreakDuration: 5 * 60,
        longBreakDuration: 15 * 60,
        longBreakInterval: 4
      };
    }
  }