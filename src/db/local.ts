import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { DB_SCHEMA, Task, TimerSession, TimerConfig, SyncQueue, TimerStateDB, DEFAULT_VALUES } from './schema';

interface TicTaskDB extends DBSchema {
  tasks: {
    key: string;
    value: Task;
    indexes: {
      'by-status': string;
      'by-due-date': number;
    };
  };
  sessions: {
    key: string;
    value: TimerSession;
    indexes: {
      'by-date': string;
      'by-task': string;
    };
  };
  timerConfig: {
    key: string;
    value: TimerConfig;
  };
  timerState: {
    key: string;
    value: TimerStateDB;
  };
  syncQueue: {
    key: string;
    value: SyncQueue;
  };
}

export class LocalStorage {
  private db: IDBPDatabase<TicTaskDB>;
  private static instance: LocalStorage;
  private initialized: Promise<void>;

  private constructor() {
    this.initialized = this.initDB();
  }

  static getInstance(): LocalStorage {
    if (!LocalStorage.instance) {
      LocalStorage.instance = new LocalStorage();
    }
    return LocalStorage.instance;
  }

  private async initDB() {
    this.db = await openDB<TicTaskDB>('tictask-db', 1, {
      upgrade(db) {
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('by-status', 'status');
          taskStore.createIndex('by-due-date', 'dueDate');
        }

        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('by-date', 'date');
          sessionStore.createIndex('by-task', 'taskId');
        }

        if (!db.objectStoreNames.contains('timerConfig')) {
          const configStore = db.createObjectStore('timerConfig', { keyPath: 'id' });
          // Add default config
          configStore.put(DEFAULT_VALUES.timerConfig);
        }

        if (!db.objectStoreNames.contains('timerState')) {
          const stateStore = db.createObjectStore('timerState', { keyPath: 'id' });
          // Add default state
          stateStore.put(DEFAULT_VALUES.timerState);
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }
      },
    });
  }

  // Make sure DB is initialized before any operation
  private async ensureDB() {
    await this.initialized;
    return this.db;
  }

  async getTimerState(): Promise<TimerStateDB> {
    const db = await this.ensureDB();
    const state = await db.get('timerState', 'default');
    return state || DEFAULT_VALUES.timerState;
  }

  async updateTimerState(updates: Partial<TimerStateDB>): Promise<TimerStateDB> {
    const db = await this.ensureDB();
    const currentState = await this.getTimerState();
    const newState = { ...currentState, ...updates };
    await db.put('timerState', newState);
    return newState;
  }

  async getTimerConfig(): Promise<TimerConfig> {
    const db = await this.ensureDB();
    const config = await db.get('timerConfig', 'default');
    return config || DEFAULT_VALUES.timerConfig;
  }

  async saveTimerConfig(config: TimerConfig): Promise<void> {
    const db = await this.ensureDB();
    await db.put('timerConfig', config);
    
    // Add to sync queue for tracking changes
    await this.addToSyncQueue('UPDATE', 'config', config);
    
    // Broadcast the change
    chrome.runtime.sendMessage({ 
      type: 'CONFIG_CHANGED',
      config 
    });
  }

  // Task operations
  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'pomodorosCompleted'>): Promise<Task> {
    const newTask: Task = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pomodorosCompleted: 0,
      ...task
    };

    await this.db.add('tasks', newTask);
    await this.addToSyncQueue('CREATE', 'task', newTask);
    return newTask;
  }

  async getAllTasks(): Promise<Task[]> {
    const db = await this.ensureDB();
    const tasks = await db.getAll('tasks');
    return tasks.filter(task => task.status === 'to_do' || task.status === 'in_progress');
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
    const task = await this.db.get('tasks', taskId);
    if (!task) return null;

    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: Date.now()
    };

    await this.db.put('tasks', updatedTask);
    await this.addToSyncQueue('UPDATE', 'task', updatedTask);
    return updatedTask;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    await this.db.delete('tasks', taskId);
    await this.addToSyncQueue('DELETE', 'task', { id: taskId });
    return true;
  }

  // Session operations
  async saveSession(session: TimerSession): Promise<void> {
    await this.db.add('sessions', session);
    await this.addToSyncQueue('CREATE', 'session', session);
  }

  async getSessionsByDateRange(startDate: string, endDate: string): Promise<TimerSession[]> {
    const sessions = await this.db.getAllFromIndex('sessions', 'by-date');
    return sessions.filter(session => 
      session.date >= startDate && session.date <= endDate
    );
  }

  // Sync operations
  private async addToSyncQueue(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    type: 'task' | 'session' | 'config',
    data: any
  ): Promise<void> {
    const syncItem: SyncQueue = {
      id: crypto.randomUUID(),
      operation,
      type,
      data,
      timestamp: new Date().toISOString()
    };
    await this.db.add('syncQueue', syncItem);
  }

  async getSyncQueue(): Promise<SyncQueue[]> {
    return await this.db.getAll('syncQueue');
  }

  async deleteSyncQueueItem(id: string): Promise<void> {
    await this.db.delete('syncQueue', id);
  }

  async getTask(taskId: string): Promise<Task | null> {
    return await this.db.get('tasks', taskId);
  }
}

export const storage = LocalStorage.getInstance(); 