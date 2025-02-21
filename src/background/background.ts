// src/background/background.ts
import { storage } from '@/db/local';
import { TimerConfig, TimerSession, TimerStateDB, DEFAULT_VALUES } from '@/db/schema';


class BackgroundTimer {
  private interval: NodeJS.Timeout | null = null;
  private state: TimerStateDB;
  private config: TimerConfig;

  constructor() {
    this.setupInstallListener();
    this.setupMessageListeners();
    this.loadState();
    this.setupKeepAlive();
  }

  private async setupInstallListener() {
    chrome.runtime.onInstalled.addListener(async (details) => {
      if (details.reason === 'install') {
        // Set default values
        await storage.saveTimerConfig(DEFAULT_VALUES.timerConfig);
        await storage.updateTimerState(DEFAULT_VALUES.timerState);
        
        // Set default notification preference
        await chrome.storage.sync.set({ notifications: true });
      }
    });
  }

  private async loadState() {
    this.state = await storage.getTimerState();
    this.config = await storage.getTimerConfig();
  }

  private async saveState(updates: Partial<TimerStateDB>) {
    this.state = await storage.updateTimerState(updates);
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
        case 'START_BREAK':
          this.startBreak();
          sendResponse(this.getState());
          break;
        case 'SKIP_BREAK':
          this.skipBreak();
          sendResponse(this.getState());
          break;
      }
      return true; // Required for async response
    });
  }

  private setupKeepAlive() {
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === "timer-port") {
        try {
          port.onDisconnect.addListener(() => {
            // Silently handle disconnection
            if (chrome.runtime.lastError) {
              console.debug("Port disconnected:", chrome.runtime.lastError.message);
            }
          });
        } catch (error) {
          console.debug("Port error:", error);
        }
      }
    });

    // Check timer state periodically
    setInterval(() => {
      if (this.state.status === 'running' && !this.interval) {
        this.start(this.state.currentTaskId);
      }
    }, 5000);
  }

  private async handleConfigChange(newConfig: TimerConfig, currentStatus: string) {
    const oldConfig = { ...this.config };
    this.config = newConfig;

    // Always update timeRemaining in idle state
    if (this.state.status === 'idle') {
      this.state.timeRemaining = newConfig.pomoDuration;
      await this.saveState(this.state);
      this.broadcastState();
      return;
    }

    // Handle active states
    if (this.state.status === 'break' || this.state.status === 'running' || this.state.status === 'paused') {
      if (this.state.status === 'break') {
        const isLongBreak = this.state.pomodorosCompleted % this.config.longBreakInterval === 0;
        const oldDuration = isLongBreak ? oldConfig.longBreakDuration : oldConfig.shortBreakDuration;
        const newDuration = isLongBreak ? newConfig.longBreakDuration : newConfig.shortBreakDuration;

        if (oldDuration !== newDuration) {
          const remainingPercentage = this.state.timeRemaining / oldDuration;
          this.state.timeRemaining = Math.round(remainingPercentage * newDuration);
          await this.saveState(this.state);
          this.broadcastState();
        }
      } else {
        if (oldConfig.pomoDuration !== newConfig.pomoDuration) {
          const remainingPercentage = this.state.timeRemaining / oldConfig.pomoDuration;
          this.state.timeRemaining = Math.round(remainingPercentage * newConfig.pomoDuration);
          await this.saveState(this.state);
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

    await storage.saveSession(session);

    if (type === 'pomodoro' && this.state.currentTaskId) {
      await storage.updateTask(this.state.currentTaskId, {
        pomodorosCompleted: (await storage.getTask(this.state.currentTaskId))?.pomodorosCompleted + 1 || 1
      });
    }
  }

  private async start(taskId?: string | null) {
    if (this.state.status === 'running') return;

    if (taskId !== undefined) {
      this.state.currentTaskId = taskId;
      // Update task status to in_progress when timer starts
      if (taskId) {
        await storage.updateTask(taskId, { status: 'in_progress' });
      }
    }

    this.state.status = 'running';
    this.state.lastUpdateTime = Date.now();
    await this.saveState(this.state);

    this.interval = setInterval(async () => {
      const currentTime = Date.now();
      const deltaSeconds = Math.floor((currentTime - this.state.lastUpdateTime) / 1000);
      this.state.lastUpdateTime = currentTime;

      if (deltaSeconds > 0) {
        this.state.timeRemaining = Math.max(0, this.state.timeRemaining - deltaSeconds);
        await this.saveState(this.state);
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

  private async pause() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.state.status = 'paused';
    await this.saveState(this.state);
    this.broadcastState();
  }

  private async reset() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    // Update task status back to to_do when timer is reset
    if (this.state.currentTaskId) {
      const task = await storage.getTask(this.state.currentTaskId);
      if (task && task.status === 'in_progress') {
        await storage.updateTask(this.state.currentTaskId, { status: 'to_do' });
      }
    }

    await this.loadConfig();
    this.state.timeRemaining = this.state.status === 'break' 
      ? (this.state.pomodorosCompleted % this.config.longBreakInterval === 0 
        ? this.config.longBreakDuration 
        : this.config.shortBreakDuration)
      : this.config.pomoDuration;
    this.state.status = 'idle';
    this.state.currentTaskId = null;
    await this.saveState(this.state);
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
    await this.saveState(this.state);
    this.broadcastState();
  }

  private getState(): TimerStateDB {
    return { ...this.state };
  }

  private async loadConfig() {
    const config = await storage.getTimerConfig();
    this.config = config;
    
    // Only update timeRemaining if in idle state
    if (this.state.status === 'idle') {
      this.state.timeRemaining = this.config.pomoDuration;
    }
    
    // Get notifications setting (TODO: move to storage)
    const result = await chrome.storage.sync.get('notifications');
    return result.notifications !== false;
  }

  private async startBreak() {
    if (this.state.status !== 'break') return;
    
    const isLongBreak = this.state.pomodorosCompleted % this.config.longBreakInterval === 0;
    this.state.timeRemaining = isLongBreak 
      ? this.config.longBreakDuration 
      : this.config.shortBreakDuration;
    
    await this.start();
  }

  private async skipBreak() {
    if (this.state.status !== 'break') return;
    
    // Reset for next focus session
    this.state.status = 'idle';
    this.state.timeRemaining = this.config.pomoDuration;
    this.state.currentTaskId = null;
    await this.saveState(this.state);
    this.broadcastState();
  }
}

// Initialize the background timer
const backgroundTimer = new BackgroundTimer();