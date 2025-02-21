// src/lib/services/taskService.ts
import { Task } from '@/types';
import { storage } from '@/db/local';

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
    return await storage.createTask(taskData);
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
    return await storage.updateTask(taskId, updates);
  }

  async deleteTask(taskId: string): Promise<boolean> {
    return await storage.deleteTask(taskId);
  }

  async getAllTasks(): Promise<Task[]> {
    return await storage.getAllTasks();
  }

  async incrementPomodoroCount(taskId: string): Promise<Task | null> {
    const task = await storage.updateTask(taskId, {
      pomodorosCompleted: (await storage.getTask(taskId))?.pomodorosCompleted + 1 || 1
    });
    return task;
  }
}