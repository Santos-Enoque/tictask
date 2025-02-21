// src/lib/services/timerService.ts
import { EventEmitter } from 'events';
import { TimerConfig } from '@/db/schema';
import { storage } from '@/db/local';

export type TimerState = 'idle' | 'running' | 'paused' | 'break';

export class TimerService extends EventEmitter {
  private timeRemaining: number = 0;
  private interval: NodeJS.Timeout | null = null;
  private state: TimerState = 'idle';
  private pomodorosCompleted: number = 0;
  private config: TimerConfig;

  constructor() {
    super();
    this.config = {
      id: 'default',
      pomoDuration: 25 * 60,
      shortBreakDuration: 5 * 60,
      longBreakDuration: 15 * 60,
      longBreakInterval: 4
    };
    this.timeRemaining = this.config.pomoDuration;
    this.loadConfig();
  }

  private async loadConfig() {
    this.config = await storage.getTimerConfig();
    this.timeRemaining = this.config.pomoDuration;
    this.emit('tick', this.timeRemaining);
  }

  async updateConfig(config: Partial<TimerConfig>): Promise<void> {
    await storage.saveTimerConfig({ ...this.config, ...config });
    await this.loadConfig();
  }

  start(): void {
    if (this.state === 'running') return;

    this.state = 'running';
    this.interval = setInterval(() => {
      this.timeRemaining--;
      this.emit('tick', this.timeRemaining);

      if (this.timeRemaining <= 0) {
        this.complete();
      }
    }, 1000);

    this.emit('stateChange', this.state);
  }

  pause(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.state = 'paused';
    this.emit('stateChange', this.state);
  }

  reset(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.timeRemaining = this.config.pomoDuration;
    this.state = 'idle';
    this.emit('stateChange', this.state);
    this.emit('tick', this.timeRemaining);
  }

  private complete(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    if (this.state !== 'break') {
      this.pomodorosCompleted++;
      this.emit('pomodoroComplete', this.pomodorosCompleted);
      
      // Determine break duration
      const isLongBreak = this.pomodorosCompleted % this.config.longBreakInterval === 0;
      this.timeRemaining = isLongBreak 
        ? this.config.longBreakDuration 
        : this.config.shortBreakDuration;
    } else {
      this.timeRemaining = this.config.pomoDuration;
    }

    this.state = this.state === 'break' ? 'idle' : 'break';
    this.emit('stateChange', this.state);
    this.emit('tick', this.timeRemaining);
  }

  getState(): TimerState {
    return this.state;
  }

  getTimeRemaining(): number {
    return this.timeRemaining;
  }

  getPomodorosCompleted(): number {
    return this.pomodorosCompleted;
  }
}