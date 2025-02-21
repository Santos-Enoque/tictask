// src/lib/services/timerService.ts
import { EventEmitter } from 'events';

export type TimerState = 'idle' | 'running' | 'paused' | 'break';

export interface TimerConfig {
  pomoDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
}

export class TimerService extends EventEmitter {
  private timeRemaining: number = 0;
  private interval: NodeJS.Timeout | null = null;
  private state: TimerState = 'idle';
  private pomodorosCompleted: number = 0;

  private config: TimerConfig = {
    pomoDuration: 25 * 60, // 25 minutes in seconds
    shortBreakDuration: 5 * 60, // 5 minutes in seconds
    longBreakDuration: 15 * 60, // 15 minutes in seconds
    longBreakInterval: 4 // Number of pomodoros before long break
  };

  constructor(config?: Partial<TimerConfig>) {
    super();
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.timeRemaining = this.config.pomoDuration;
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