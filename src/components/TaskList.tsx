// src/components/Tasks/TaskList.tsx
import React, { useEffect, useState } from 'react';
import { Task, TaskService } from '@/lib/services/taskService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Timer, Check, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface TaskItemProps {
  task: Task;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onSelect?: (taskId: string) => void;
  isSelected?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onDelete, onComplete, onSelect, isSelected }) => {
  return (
    <div className={`p-4 border rounded-lg mb-2 ${isSelected ? 'bg-accent' : ''} ${task.status === 'completed' ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
          )}
          <div className="flex items-center mt-2 space-x-2">
            <Badge variant="outline" className="text-xs">
              {task.pomodorosCompleted} 🍅
              {task.estimatedPomodoros && ` / ${task.estimatedPomodoros}`}
            </Badge>
            <Badge variant="secondary" className="text-xs capitalize">
              {task.status}
            </Badge>
          </div>
        </div>
        <div className="flex space-x-2">
          {onSelect && task.status !== 'completed' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSelect(task.id)}
              className={isSelected ? 'text-primary' : ''}
            >
              <Timer className="h-4 w-4" />
            </Button>
          )}
          {task.status !== 'completed' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onComplete(task.id)}
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(task.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

interface TaskListProps {
  selectedTaskId?: string;
  onTaskSelect?: (taskId: string | null) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ selectedTaskId, onTaskSelect }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    estimatedPomodoros: ''
  });

  const taskService = TaskService.getInstance();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    const loadedTasks = await taskService.getAllTasks();
    setTasks(loadedTasks);
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;

    await taskService.createTask({
      title: newTask.title,
      description: newTask.description,
      estimatedPomodoros: newTask.estimatedPomodoros ? parseInt(newTask.estimatedPomodoros) : undefined,
      status: 'pending'
    });

    setNewTask({ title: '', description: '', estimatedPomodoros: '' });
    setIsAddingTask(false);
    loadTasks();
  };

  const handleDeleteTask = async (taskId: string) => {
    await taskService.deleteTask(taskId);
    if (selectedTaskId === taskId && onTaskSelect) {
      onTaskSelect(null);
    }
    loadTasks();
  };

  const handleCompleteTask = async (taskId: string) => {
    await taskService.updateTask(taskId, {
      status: 'completed',
      completedAt: Date.now()
    });
    if (selectedTaskId === taskId && onTaskSelect) {
      onTaskSelect(null);
    }
    loadTasks();
  };

  const handleTaskSelect = (taskId: string) => {
    if (onTaskSelect) {
      onTaskSelect(selectedTaskId === taskId ? null : taskId);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl">Tasks</CardTitle>
        <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pomodoros">Estimated Pomodoros</Label>
                <Input
                  id="pomodoros"
                  type="number"
                  min="1"
                  value={newTask.estimatedPomodoros}
                  onChange={(e) => setNewTask({ ...newTask, estimatedPomodoros: e.target.value })}
                  placeholder="Number of pomodoros"
                />
              </div>
              <Button onClick={handleAddTask} className="w-full">
                Add Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {tasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No tasks yet. Add one to get started!
            </div>
          ) : (
            tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onDelete={handleDeleteTask}
                onComplete={handleCompleteTask}
                onSelect={handleTaskSelect}
                isSelected={task.id === selectedTaskId}
              />
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};