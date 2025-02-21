// src/lib/services/taskService.ts
import { Task } from '@/types';
  export class TaskService {
    private static instance: TaskService;
  
    private constructor() {}
  
    static getInstance(): TaskService {
      if (!TaskService.instance) {
        TaskService.instance = new TaskService();
      }
      return TaskService.instance;
    }
  
    async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'pomodorosCompleted'>): Promise<Task> {
      const task: Task = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pomodorosCompleted: 0,
        ...taskData
      };
  
      const { tasks = [] } = await chrome.storage.local.get('tasks');
      await chrome.storage.local.set({ tasks: [...tasks, task] });
      return task;
    }
  
    async updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
      const { tasks = [] } = await chrome.storage.local.get('tasks');
      const taskIndex = tasks.findIndex((t: Task) => t.id === taskId);
      
      if (taskIndex === -1) return null;
  
      const updatedTask = {
        ...tasks[taskIndex],
        ...updates,
        updatedAt: Date.now()
      };
  
      tasks[taskIndex] = updatedTask;
      await chrome.storage.local.set({ tasks });
      return updatedTask;
    }
  
    async deleteTask(taskId: string): Promise<boolean> {
      const { tasks = [] } = await chrome.storage.local.get('tasks');
      const updatedTasks = tasks.filter((t: Task) => t.id !== taskId);
      await chrome.storage.local.set({ tasks: updatedTasks });
      return true;
    }
  
    async getAllTasks(): Promise<Task[]> {
      const { tasks = [] } = await chrome.storage.local.get('tasks');
      return tasks;
    }
  
    async incrementPomodoroCount(taskId: string): Promise<Task | null> {
      const { tasks = [] } = await chrome.storage.local.get('tasks');
      const task = tasks.find((t: Task) => t.id === taskId);
      
      if (!task) return null;
  
      return this.updateTask(taskId, {
        pomodorosCompleted: task.pomodorosCompleted + 1
      });
    }
  }