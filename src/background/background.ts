// src/background/background.ts
import { storage } from '@/db/local';
import { TimerConfig, TimerSession, TimerStateDB, DEFAULT_VALUES } from '@/db/schema';


class BackgroundTimer {
  private interval: NodeJS.Timeout | null = null;
  private state: TimerStateDB;
  private config: TimerConfig;
  private timerMode: 'focus' | 'break' = 'focus';

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
    const [timerState, timerConfig] = await Promise.all([
      storage.getTimerState(),
      storage.getTimerConfig()
    ]);
    
    this.config = timerConfig;
    this.state = timerState;
    
    // Ensure timeRemaining is synced with config when idle
    if (this.state.status === 'idle') {
      this.state.timeRemaining = this.config.pomoDuration;
      await this.saveState(this.state);
    }
  }

  private async saveState(updates: Partial<TimerStateDB>) {
    this.state = await storage.updateTimerState({
      ...updates,
      timerMode: this.timerMode
    });
    this.updateBadge(this.state);
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
    console.log("newConfig", newConfig);
    console.log("oldConfig", oldConfig);
    console.log("this.state.status", this.state.status);
    // If timer is idle, simply update to new duration
    if (this.state.status === 'idle') {
      this.state.timeRemaining = this.timerMode === 'focus' 
        ? newConfig.pomoDuration 
        : (this.state.pomodorosCompleted % newConfig.longBreakInterval === 0 
          ? newConfig.longBreakDuration 
          : newConfig.shortBreakDuration);
      await this.saveState(this.state);
      this.broadcastState();
      return;
    }

    // For active timers, adjust the remaining time proportionally
    if (this.state.status === 'running' || this.state.status === 'paused' || this.state.status === 'break') {
      let oldDuration, newDuration;
      
      if (this.timerMode === 'break') {
        const isLongBreak = this.state.pomodorosCompleted % newConfig.longBreakInterval === 0;
        oldDuration = isLongBreak ? oldConfig.longBreakDuration : oldConfig.shortBreakDuration;
        newDuration = isLongBreak ? newConfig.longBreakDuration : newConfig.shortBreakDuration;
      } else {
        oldDuration = oldConfig.pomoDuration;
        newDuration = newConfig.pomoDuration;
      }

      // Calculate remaining time as a percentage and apply to new duration
      const remainingPercentage = this.state.timeRemaining / oldDuration;
      this.state.timeRemaining = Math.round(remainingPercentage * newDuration);
      
      await this.saveState(this.state);
      this.broadcastState();
    }
  }

  private async broadcastState() {
    try {
      const state = this.getState();
      // Use runtime.sendMessage with a catch block
      await chrome.runtime.sendMessage({ 
        type: 'TIMER_UPDATE', 
        state 
      }).catch((error) => {
        // Ignore "receiving end does not exist" errors as they're expected
        // when popup is closed
        if (!error.message.includes("receiving end does not exist")) {
          console.error("Error broadcasting state:", error);
        }
      });
    } catch (error) {
      // Handle any other errors that might occur
      console.error("Failed to broadcast state:", error);
    }
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

    if (this.state.status !== 'break') {
      this.timerMode = 'focus';
    }

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
    if (this.timerMode === 'break') {
      const isLongBreak = this.state.pomodorosCompleted % this.config.longBreakInterval === 0;
      this.state.timeRemaining = isLongBreak 
        ? this.config.longBreakDuration 
        : this.config.shortBreakDuration;
    } else {
      this.state.timeRemaining = this.config.pomoDuration;
    }
    
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
  
    if (this.timerMode === 'focus') {
      // Focus session completion logic
      this.state.pomodorosCompleted++;
      await this.saveSession('pomodoro');
      
      this.timerMode = 'break';
      const isLongBreak = this.state.pomodorosCompleted % this.config.longBreakInterval === 0;
      this.state.timeRemaining = isLongBreak 
        ? this.config.longBreakDuration 
        : this.config.shortBreakDuration;
      
      this.state.status = 'break';
      
      if (notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/icon.png',
          title: isLongBreak ? 'Long Break Time!' : 'Short Break Time!',
          message: `Great work! Take a ${isLongBreak ? 'long' : 'short'} break.`,
        });
      }
    } else {
      // Break session completion logic
      await this.saveSession(
        this.state.pomodorosCompleted % this.config.longBreakInterval === 0 
          ? 'long_break' 
          : 'short_break'
      );
      
      this.timerMode = 'focus';
      this.state.timeRemaining = this.config.pomoDuration;
      this.state.status = 'idle';
      this.state.currentTaskId = null;
      
      if (notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/icon.png',
          title: 'Break Complete',
          message: 'Time to focus again!',
        });
      }
    }
    
    await this.saveState(this.state);
    this.broadcastState();
  }

  private getState(): TimerStateDB {
    return { 
      ...this.state,
      timerMode: this.timerMode
    };
  }

  private async loadConfig() {
    this.syncTimerWithConfig();
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
    
    this.timerMode = 'break';
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
          await this.completeBreak();
        }
      }
    }, 1000);

    this.broadcastState();
    
    const notifications = await this.loadConfig();
    if (notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icon.png',
        title: 'Break Started',
        message: 'Time to recharge!',
      });
    }
  }

  private async completeBreak() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    await this.saveSession(
      this.state.pomodorosCompleted % this.config.longBreakInterval === 0 
        ? 'long_break' 
        : 'short_break'
    );

    this.timerMode = 'focus';
    this.state.status = 'idle';
    this.state.timeRemaining = this.config.pomoDuration;
    this.state.currentTaskId = null;
    await this.saveState(this.state);
    this.broadcastState();

    const notifications = await this.loadConfig();
    if (notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icon.png',
        title: 'Break Complete',
        message: 'Time to focus again!',
      });
    }
  }

  private async skipBreak() {
    if (this.state.status !== 'break') return;
    
    this.timerMode = 'focus';
    this.state.status = 'idle';
    this.state.timeRemaining = this.config.pomoDuration;
    this.state.currentTaskId = null;
    await this.saveState(this.state);
    this.broadcastState();
  }

  private formatBadgeTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}`;
  }

  private updateBadge(state: TimerStateDB) {
    if (state.status === 'running') {
      // Determine the total time based on timer mode and break type
      let totalTime;
      if (state.timerMode === 'break') {
        const isLongBreak = state.pomodorosCompleted % this.config.longBreakInterval === 0;
        totalTime = isLongBreak ? this.config.longBreakDuration : this.config.shortBreakDuration;
      } else {
        totalTime = this.config.pomoDuration;
      }
      
      // Calculate progress
      const progress = (totalTime - state.timeRemaining) / totalTime;
      
      let indicator = '○'; // Empty
      if (progress > 0.25) indicator = '◔';
      if (progress > 0.5) indicator = '◑';
      if (progress > 0.75) indicator = '◕';
      if (progress > 0.9) indicator = '●';

      chrome.action.setBadgeText({ text: indicator });
      chrome.action.setBadgeBackgroundColor({ 
        color: state.timerMode === 'focus' ? '#ef4444' : '#22c55e'
      });
      
      // Detailed time in hover
      const minutes = Math.floor(state.timeRemaining / 60);
      const seconds = state.timeRemaining % 60;
      const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      chrome.action.setTitle({ 
        title: `TicTask - ${timeString} remaining`
      });
    } else {
      chrome.action.setBadgeText({ text: '' });
      chrome.action.setTitle({ title: 'TicTask' });
    }
  }

  private async syncTimerWithConfig() {
    const currentConfig = await storage.getTimerConfig();
    
    // Update the config
    this.config = currentConfig;
    
    // Update timeRemaining based on current mode and state
    if (this.state.status === 'idle' || this.state.timeRemaining === 0) {
      this.state.timeRemaining = this.timerMode === 'focus' 
        ? currentConfig.pomoDuration
        : (this.state.pomodorosCompleted % currentConfig.longBreakInterval === 0 
          ? currentConfig.longBreakDuration 
          : currentConfig.shortBreakDuration);
      
      await this.saveState(this.state);
      this.broadcastState();
    }
  }
}

// Initialize the background timer
const backgroundTimer = new BackgroundTimer();