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

  constructor() {
    this.setupMessageListeners();
    this.loadConfig(); // Load initial config
  }

  private async loadConfig() {
    const result = await chrome.storage.sync.get(['timerConfig', 'notifications']);
    if (result.timerConfig) {
      this.config = result.timerConfig;
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
      }
    });
  }

  private async broadcastState() {
    const state = this.getState();
    chrome.runtime.sendMessage({ type: 'TIMER_UPDATE', state });
  }

  private async saveSession(type: 'pomodoro' | 'short_break' | 'long_break') {
    const session: TimerSession = {
      id: Date.now().toString(),
      startTime: Date.now() - (this.config.pomoDuration - this.state.timeRemaining) * 1000,
      endTime: Date.now(),
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
    this.interval = setInterval(() => {
      this.state.timeRemaining--;
      this.broadcastState();

      if (this.state.timeRemaining <= 0) {
        this.complete();
      }
    }, 1000);

    this.broadcastState();
    
    const notifications = await this.loadConfig();
    if (notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icon.png',
        title: 'Pomodoro Timer Started',
        message: 'Focus time has begun!',
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
    await this.loadConfig(); // Reload config in case it changed
    this.state.timeRemaining = this.config.pomoDuration;
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
          title: isLongBreak ? 'Long Break Time!' : 'Break Time!',
          message: `Great work! Take a ${isLongBreak ? 'long' : 'short'} break.`,
        });
      }
    } else {
      await this.saveSession(this.state.timeRemaining === this.config.longBreakDuration ? 'long_break' : 'short_break');
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

// Keep service worker alive
chrome.runtime.onConnect.addListener(function(port) {
  port.onDisconnect.addListener(function() {
    // Reconnect logic if needed
  });
});