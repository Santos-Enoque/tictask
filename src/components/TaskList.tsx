// src/components/TaskList.tsx
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import React, { useEffect, useState } from "react";
import { TaskService } from "@/lib/services/taskService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Trash2,
  Calendar,
  MoreVertical,
  Play,
  Pause,
  Pencil,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "@radix-ui/react-icons";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Task } from "@/db/schema";
import { TaskStatus } from "@/types";
interface TaskItemProps {
  task: Task;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onSelect?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  isSelected?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onDelete,
  onComplete,
  onSelect,
  onEdit,
  isSelected,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [timerState, setTimerState] = useState<string>("idle");
  const [anyTimerRunning, setAnyTimerRunning] = useState(false);

  useEffect(() => {
    const getInitialState = async () => {
      const response = await chrome.runtime.sendMessage({
        type: "GET_TIMER_STATE",
      });
      if (response) {
        if (task.id === response.currentTaskId) {
          setTimerState(response.status);
        }
        setAnyTimerRunning(
          response.status === "running" ||
            response.status === "break" ||
            response.status === "paused"
        );
      }
    };

    getInitialState();

    const handleTimerUpdate = (message: any) => {
      if (message.type === "TIMER_UPDATE") {
        if (task.id === message.state.currentTaskId) {
          setTimerState(message.state.status);
        }
        setAnyTimerRunning(
          message.state.status === "running" ||
            message.state.status === "break" ||
            message.state.status === "paused"
        );
      }
    };

    chrome.runtime.onMessage.addListener(handleTimerUpdate);
    return () => chrome.runtime.onMessage.removeListener(handleTimerUpdate);
  }, [task.id]);

  const getBorderColor = () => {
    if (isSelected) {
      switch (timerState) {
        case "running":
          return "border-green-500";
        case "paused":
          return "border-yellow-500";
        default:
          return "border-accent";
      }
    }
    return "border-border";
  };

  const handleStatusChange = (checked: boolean) => {
    const newStatus: TaskStatus = checked ? "completed" : "to_do";
    onComplete(task.id);
  };

  return (
    <div
      className={`
        p-4 border-2 rounded-lg mb-2 
        ${isSelected ? "bg-accent" : "bg-card"} 
        ${getBorderColor()}
        ${task.status === "completed" ? "opacity-60" : ""}
        transition-all
        hover:shadow-sm
        w-full max-w-full flex-shrink-0 flex-grow
      `}
    >
      <div className="flex items-center justify-between gap-4 w-full">
        <div className="flex items-start gap-3 flex-1 min-w-0 w-full">
          <Checkbox
            checked={task.status === "completed"}
            onCheckedChange={handleStatusChange}
            className="mt-1"
          />
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={`font-medium truncate ${
                  task.status === "completed"
                    ? "line-through text-muted-foreground"
                    : ""
                }`}
              >
                {task.title}
              </h3>
              {task.status === "in_progress" && (
                <Badge
                  variant="secondary"
                  className="text-xs capitalize shrink-0"
                >
                  In Progress
                </Badge>
              )}
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                <span className="mr-1">{task.pomodorosCompleted}</span>
                🍅
                {task.estimatedPomodoros && (
                  <span className="ml-1">/ {task.estimatedPomodoros}</span>
                )}
              </Badge>
              {task.ongoing && (
                <Badge variant="secondary" className="text-xs">
                  <span className="mr-1">Ongoing</span>
                </Badge>
              )}
              {task.dueDate && (
                <Badge variant="outline" className="text-xs">
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {format(new Date(task.dueDate), "MMM d, yyyy")}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-accent">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-0">
              <div className="flex flex-col">
                {task.status !== "completed" && onSelect && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start rounded-none"
                    onClick={() => onSelect(task.id)}
                    disabled={anyTimerRunning && !isSelected}
                  >
                    {isSelected ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Stop Timer
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Start Timer
                      </>
                    )}
                  </Button>
                )}
                {onEdit && task.status !== "completed" && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start rounded-none"
                    onClick={() => onEdit(task)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="w-full justify-start rounded-none text-destructive hover:text-destructive"
                  onClick={() => onDelete(task.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

interface TaskListProps {
  selectedTaskId?: string;
  onTaskSelect?: (taskId: string | null) => void;
  onTaskSelected?: () => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  selectedTaskId,
  onTaskSelect,
  onTaskSelected,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(),
    new Date(),
  ]);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    estimatedPomodoros: "",
    dueDate: new Date(),
    ongoing: false,
  });

  const taskService = TaskService.getInstance();

  useEffect(() => {
    loadTasks();
  }, [dateRange]);

  useEffect(() => {
    const initializeSelectedTask = async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          type: "GET_TIMER_STATE",
        });
        if (response?.currentTaskId && onTaskSelect) {
          onTaskSelect(response.currentTaskId);
        }
      } catch (error) {
        console.error("Failed to initialize selected task:", error);
      }
    };

    initializeSelectedTask();
  }, [onTaskSelect]);

  const loadTasks = async () => {
    const loadedTasks = await taskService.getAllTasks();
    const [startDate, endDate] = dateRange;

    if (!startDate || !endDate) return;

    // Set start date to beginning of day (00:00:00)
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    // Set end date to end of day (23:59:59.999)
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Filter tasks based on date range and ongoing status
    const filteredTasks = loadedTasks.filter((task) => {
      // Always include ongoing tasks
      if (task.ongoing) return true;

      // For non-ongoing tasks, check if they fall within the date range
      const taskDate = new Date(task.dueDate);
      taskDate.setHours(0, 0, 0, 0); // Normalize task date to start of day
      return taskDate >= start && taskDate <= end;
    });

    // Sort tasks: ongoing tasks first, then by due date
    const sortedTasks = filteredTasks.sort((a, b) => {
      // First sort by ongoing status (ongoing tasks come first)
      if (a.ongoing && !b.ongoing) return -1;
      if (!a.ongoing && b.ongoing) return 1;

      // Then sort by due date (earlier dates first)
      return a.dueDate - b.dueDate;
    });

    setTasks(sortedTasks);
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;

    await taskService.createTask({
      title: newTask.title,
      description: newTask.description,
      estimatedPomodoros: newTask.estimatedPomodoros
        ? parseInt(newTask.estimatedPomodoros)
        : undefined,
      status: "to_do",
      dueDate: newTask.dueDate.getTime(),
      ongoing: newTask.ongoing,
    });

    setNewTask({
      title: "",
      description: "",
      estimatedPomodoros: "",
      dueDate: new Date(),
      ongoing: false,
    });
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
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newStatus: TaskStatus =
      task.status === "completed" ? "to_do" : "completed";

    await taskService.updateTask(taskId, {
      status: newStatus,
      completedAt: newStatus === "completed" ? Date.now() : undefined,
    });

    if (
      selectedTaskId === taskId &&
      onTaskSelect &&
      newStatus === "completed"
    ) {
      onTaskSelect(null);
    }
    loadTasks();
  };

  const handleTaskSelect = async (taskId: string) => {
    if (onTaskSelect) {
      const newTaskId = selectedTaskId === taskId ? null : taskId;
      onTaskSelect(newTaskId);

      // If we're deselecting the task (stopping the timer)
      if (newTaskId === null) {
        await chrome.runtime.sendMessage({ type: "PAUSE_TIMER" });
        await chrome.runtime.sendMessage({ type: "RESET_TIMER" });
      } else {
        // Starting the timer with the new task
        await chrome.runtime.sendMessage({
          type: "START_TIMER",
          taskId: newTaskId,
        });
      }

      if (onTaskSelected) {
        onTaskSelected();
      }
    }
  };

  const handleEditTask = async () => {
    if (!editingTask || !editingTask.title.trim()) return;

    await taskService.updateTask(editingTask.id, {
      title: editingTask.title,
      description: editingTask.description,
      estimatedPomodoros: editingTask.estimatedPomodoros,
      dueDate: editingTask.dueDate,
      ongoing: editingTask.ongoing,
    });

    setEditingTask(null);
    setIsEditingTask(false);
    loadTasks();
  };

  const startEditing = (task: Task) => {
    setEditingTask({
      ...task,
      dueDate: task.dueDate,
    });
    setIsEditingTask(true);
  };

  return (
    <div className="h-full w-full">
      <div className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h2 className="text-xl font-semibold">Tasks</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <DatePicker
              selected={dateRange[0]}
              onChange={(dates) => {
                setDateRange(dates as [Date | null, Date | null]);
              }}
              startDate={dateRange[0]}
              endDate={dateRange[1]}
              selectsRange
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              customInput={
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  {dateRange[0] && dateRange[1] ? (
                    <>
                      {format(dateRange[0], "MMM d")} -{" "}
                      {format(dateRange[1], "MMM d")}
                    </>
                  ) : (
                    "Select dates"
                  )}
                </Button>
              }
            />
          </div>
          <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
                <DialogDescription>
                  Create a new task to track with your pomodoro timer.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                    placeholder="Task title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask({ ...newTask, description: e.target.value })
                    }
                    placeholder="Task description (optional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pomodoros">Estimated Pomodoros</Label>
                  <Input
                    id="pomodoros"
                    type="number"
                    min="1"
                    value={newTask.estimatedPomodoros}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        estimatedPomodoros: e.target.value,
                      })
                    }
                    placeholder="Number of pomodoros (optional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <div className="relative">
                    <DatePicker
                      selected={newTask.dueDate}
                      onChange={(date: Date) =>
                        setNewTask({ ...newTask, dueDate: date })
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      dateFormat="MMM d, yyyy"
                      placeholderText="Select a due date"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between space-y-0 py-2">
                  <div className="flex flex-col space-y-1">
                    <Label htmlFor="ongoing-task">Ongoing Task</Label>
                    <span className="text-xs text-muted-foreground">
                      Show this task every day until completion
                    </span>
                  </div>
                  <Switch
                    id="ongoing-task"
                    checked={newTask.ongoing}
                    onCheckedChange={(checked) =>
                      setNewTask({ ...newTask, ongoing: checked })
                    }
                  />
                </div>
                <Button onClick={handleAddTask} className="w-full">
                  Add Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="mt-2 w-full">
        <ScrollArea className="h-[300px] w-full">
          {tasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 w-full">
              No tasks for the selected date range. Add one to get started!
            </div>
          ) : (
            <div className="w-full pr-4">
              {tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onDelete={handleDeleteTask}
                  onComplete={handleCompleteTask}
                  onSelect={handleTaskSelect}
                  onEdit={startEditing}
                  isSelected={task.id === selectedTaskId}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Edit Task Dialog */}
        <Dialog open={isEditingTask} onOpenChange={setIsEditingTask}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>
                Update the details of your task.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingTask?.title || ""}
                  onChange={(e) =>
                    setEditingTask((prev) =>
                      prev ? { ...prev, title: e.target.value } : null
                    )
                  }
                  placeholder="Task title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingTask?.description || ""}
                  onChange={(e) =>
                    setEditingTask((prev) =>
                      prev ? { ...prev, description: e.target.value } : null
                    )
                  }
                  placeholder="Task description (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-pomodoros">Estimated Pomodoros</Label>
                <Input
                  id="edit-pomodoros"
                  type="number"
                  min="1"
                  value={editingTask?.estimatedPomodoros || ""}
                  onChange={(e) =>
                    setEditingTask((prev) =>
                      prev
                        ? {
                            ...prev,
                            estimatedPomodoros:
                              parseInt(e.target.value) || undefined,
                          }
                        : null
                    )
                  }
                  placeholder="Number of pomodoros (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <div className="relative">
                  <DatePicker
                    selected={
                      editingTask?.dueDate
                        ? new Date(editingTask.dueDate)
                        : null
                    }
                    onChange={(date: Date) =>
                      setEditingTask((prev) =>
                        prev ? { ...prev, dueDate: date.getTime() } : null
                      )
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    dateFormat="MMM d, yyyy"
                    placeholderText="Select a due date"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between space-y-0 py-2">
                <div className="flex flex-col space-y-1">
                  <Label htmlFor="edit-ongoing-task">Ongoing Task</Label>
                  <span className="text-xs text-muted-foreground">
                    Show this task every day until completion
                  </span>
                </div>
                <Switch
                  id="edit-ongoing-task"
                  checked={editingTask?.ongoing || false}
                  onCheckedChange={(checked) =>
                    setEditingTask((prev) =>
                      prev ? { ...prev, ongoing: checked } : null
                    )
                  }
                />
              </div>
              <Button onClick={handleEditTask} className="w-full">
                Update Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
