// src/background/background.ts
import { TimerConfig, TimerSession } from '@/types';

interface TimerState {
  timeRemaining: number;
  status: 'idle' | 'running' | 'paused' | 'break';
  pomodorosCompleted: number;
  currentTaskId: string | null;
}

class BackgroundTimer {
  private interval: NodeJS.Timeout | null = null;
  private state: TimerState = {
    timeRemaining: 25 * 60,
    status: 'idle',
    pomodorosCompleted: 0,
    currentTaskId: null
  };

  private config: TimerConfig = {
    pomoDuration: 25 * 60,
    shortBreakDuration: 5 * 60,
    longBreakDuration: 15 * 60,
    longBreakInterval: 4
  };

  private lastUpdateTime: number = Date.now();

  constructor() {
    this.setupMessageListeners();
    this.loadConfig();
    this.setupKeepAlive();
  }

  private async loadConfig() {
    const result = await chrome.storage.sync.get(['timerConfig', 'notifications']);
    if (result.timerConfig) {
      this.config = result.timerConfig;
      
      // Only update timeRemaining if in idle state
      if (this.state.status === 'idle') {
        this.state.timeRemaining = this.config.pomoDuration;
      }
    }
    return result.notifications !== false;
  }

  private setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'START_TIMER':
          this.start(message.taskId);
          sendResponse(this.getState());
          break;
        case 'PAUSE_TIMER':
          this.pause();
          sendResponse(this.getState());
          break;
        case 'RESET_TIMER':
          this.reset();
          sendResponse(this.getState());
          break;
        case 'GET_TIMER_STATE':
          sendResponse(this.getState());
          break;
        case 'CONFIG_CHANGED':
          this.handleConfigChange(message.config, message.currentStatus);
          sendResponse(this.getState());
          break;
      }
      return true; // Required for async response
    });
  }

  private setupKeepAlive() {
    chrome.runtime.onConnect.addListener((port) => {
      port.onDisconnect.addListener(() => {
        // Check timer state and restart if needed
        if (this.state.status === 'running' && !this.interval) {
          this.start();
        }
      });
    });

    // Check timer state periodically
    setInterval(() => {
      if (this.state.status === 'running' && !this.interval) {
        this.start();
      }
    }, 5000);
  }

  private handleConfigChange(newConfig: TimerConfig, currentStatus: string) {
    const oldConfig = { ...this.config };
    this.config = newConfig;

    if (this.state.status === 'break' || this.state.status === 'running' || this.state.status === 'paused') {
      if (this.state.status === 'break') {
        // Handle break duration changes
        const isLongBreak = this.state.pomodorosCompleted % this.config.longBreakInterval === 0;
        const oldDuration = isLongBreak ? oldConfig.longBreakDuration : oldConfig.shortBreakDuration;
        const newDuration = isLongBreak ? newConfig.longBreakDuration : newConfig.shortBreakDuration;

        if (oldDuration !== newDuration) {
          const remainingPercentage = this.state.timeRemaining / oldDuration;
          this.state.timeRemaining = Math.round(remainingPercentage * newDuration);
          this.broadcastState();
        }
      } else {
        // Handle focus duration changes
        if (oldConfig.pomoDuration !== newConfig.pomoDuration) {
          const remainingPercentage = this.state.timeRemaining / oldConfig.pomoDuration;
          this.state.timeRemaining = Math.round(remainingPercentage * newConfig.pomoDuration);
          this.broadcastState();
        }
      }
    }
  }

  private async broadcastState() {
    const state = this.getState();
    chrome.runtime.sendMessage({ type: 'TIMER_UPDATE', state });
  }

  private async saveSession(type: 'pomodoro' | 'short_break' | 'long_break') {
    const session: TimerSession = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      startTime: Date.now() - (this.config.pomoDuration - this.state.timeRemaining) * 1000,
      endTime: Date.now(),
      duration: this.config.pomoDuration - this.state.timeRemaining,
      type,
      completed: true,
      taskId: this.state.currentTaskId
    };

    const { sessions = [] } = await chrome.storage.local.get('sessions');
    await chrome.storage.local.set({ sessions: [...sessions, session] });

    if (type === 'pomodoro' && this.state.currentTaskId) {
      const { tasks = [] } = await chrome.storage.local.get('tasks');
      const taskIndex = tasks.findIndex(t => t.id === this.state.currentTaskId);
      if (taskIndex !== -1) {
        tasks[taskIndex].pomodorosCompleted++;
        await chrome.storage.local.set({ tasks });
      }
    }
  }

  private async start(taskId?: string | null) {
    if (this.state.status === 'running') return;

    if (taskId !== undefined) {
      this.state.currentTaskId = taskId;
    }

    this.state.status = 'running';
    this.lastUpdateTime = Date.now();

    this.interval = setInterval(async () => {
      const currentTime = Date.now();
      const deltaSeconds = Math.floor((currentTime - this.lastUpdateTime) / 1000);
      this.lastUpdateTime = currentTime;

      if (deltaSeconds > 0) {
        this.state.timeRemaining = Math.max(0, this.state.timeRemaining - deltaSeconds);
        this.broadcastState();

        if (this.state.timeRemaining <= 0) {
          await this.complete();
        }
      }
    }, 1000);

    this.broadcastState();
    
    const notifications = await this.loadConfig();
    const isBreakStarting = this.state.status === 'running' && this.state.timeRemaining === (
      this.state.pomodorosCompleted % this.config.longBreakInterval === 0 
        ? this.config.longBreakDuration 
        : this.config.shortBreakDuration
    );

    if (notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icon.png',
        title: isBreakStarting ? 'Break Started' : 'Focus Time Started',
        message: isBreakStarting ? 'Time to recharge!' : 'Stay focused and productive!',
      });
    }
  }

  private pause() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.state.status = 'paused';
    this.broadcastState();
  }

  private async reset() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    await this.loadConfig();
    this.state.timeRemaining = this.state.status === 'break' 
      ? (this.state.pomodorosCompleted % this.config.longBreakInterval === 0 
        ? this.config.longBreakDuration 
        : this.config.shortBreakDuration)
      : this.config.pomoDuration;
    this.state.status = 'idle';
    this.broadcastState();
  }

  private async complete() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    const notifications = await this.loadConfig();

    if (this.state.status !== 'break') {
      // Completing a focus session
      this.state.pomodorosCompleted++;
      await this.saveSession('pomodoro');
      
      const isLongBreak = this.state.pomodorosCompleted % this.config.longBreakInterval === 0;
      this.state.timeRemaining = isLongBreak 
        ? this.config.longBreakDuration 
        : this.config.shortBreakDuration;
      
      if (notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/icon.png',
          title: isLongBreak ? 'Long Break Time!' : 'Short Break Time!',
          message: `Great work! Take a ${isLongBreak ? 'long' : 'short'} break.`,
        });
      }
    } else {
      // Completing a break
      await this.saveSession(
        this.state.timeRemaining === this.config.longBreakDuration ? 'long_break' : 'short_break'
      );
      this.state.timeRemaining = this.config.pomoDuration;
      
      if (notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/icon.png',
          title: 'Break Complete',
          message: 'Time to focus again!',
        });
      }
    }

    this.state.status = this.state.status === 'break' ? 'idle' : 'break';
    this.broadcastState();
  }

  private getState(): TimerState {
    return { ...this.state };
  }
}

// Initialize the background timer
const backgroundTimer = new BackgroundTimer();