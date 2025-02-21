// src/components/Timer/Timer.tsx
import React, { useEffect, useState } from 'react';
import { Task } from '@/types';
import { TaskService } from '@/lib/services/taskService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, RotateCcw, Coffee } from 'lucide-react';

interface TimerProps {
  selectedTaskId?: string | null;
  onTaskComplete?: () => void;
}

interface TimerState {
  timeRemaining: number;
  status: 'idle' | 'running' | 'paused' | 'break';
  pomodorosCompleted: number;
  currentTaskId: string | null;
}

export const Timer: React.FC<TimerProps> = ({ selectedTaskId, onTaskComplete }) => {
  const [timerState, setTimerState] = useState<TimerState>({
    timeRemaining: 25 * 60,
    status: 'idle',
    pomodorosCompleted: 0,
    currentTaskId: null
  });
  const [progress, setProgress] = useState<number>(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const calculateProgress = (state: TimerState) => {
    const total = state.status === 'break' ? 
      (state.timeRemaining >= 15 * 60 ? 15 * 60 : 5 * 60) : // 15 min for long break, 5 for short
      25 * 60; // 25 minutes for focus
    return ((total - state.timeRemaining) / total) * 100;
  };

  useEffect(() => {
    // Load initial timer state and set progress
    chrome.runtime.sendMessage({ type: 'GET_TIMER_STATE' }, (response: TimerState) => {
      setTimerState(response);
      setProgress(calculateProgress(response));
    });

    // Set up listener for timer updates
    const handleTimerUpdate = (message: any) => {
      if (message.type === 'TIMER_UPDATE') {
        setTimerState(message.state);
        setProgress(calculateProgress(message.state));
      }
    };

    chrome.runtime.onMessage.addListener(handleTimerUpdate);

    // Keep connection alive
    const port = chrome.runtime.connect({ name: 'timer-port' });
    
    return () => {
      chrome.runtime.onMessage.removeListener(handleTimerUpdate);
      port.disconnect();
    };
  }, []);

  useEffect(() => {
    const loadTask = async () => {
      if (selectedTaskId) {
        const taskService = TaskService.getInstance();
        const tasks = await taskService.getAllTasks();
        const task = tasks.find(t => t.id === selectedTaskId);
        setSelectedTask(task || null);
      } else {
        setSelectedTask(null);
      }
    };
    loadTask();
  }, [selectedTaskId]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    chrome.runtime.sendMessage({ 
      type: 'START_TIMER',
      taskId: selectedTaskId
    });
  };

  const handlePause = () => {
    chrome.runtime.sendMessage({ type: 'PAUSE_TIMER' });
  };

  const handleReset = () => {
    chrome.runtime.sendMessage({ type: 'RESET_TIMER' });
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl">Focus Timer</CardTitle>
          <Badge 
            variant={timerState.status === 'break' ? 'secondary' : 'default'}
            className="capitalize"
          >
            {timerState.status === 'break' ? 'Break Time' : 'Focus Time'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-6xl font-bold tabular-nums">
            {formatTime(timerState.timeRemaining)}
          </div>
          
          <Progress value={progress} className="w-full" />

          <div className="flex justify-center space-x-2">
            {timerState.status === 'idle' && (
              <Button 
                variant="default" 
                size="lg"
                onClick={handleStart}
              >
                <Play className="mr-2 h-4 w-4" />
                Start
              </Button>
            )}
            
            {timerState.status === 'running' && (
              <Button 
                variant="secondary" 
                size="lg"
                onClick={handlePause}
              >
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
            )}
            
            {timerState.status === 'paused' && (
              <Button 
                variant="default" 
                size="lg"
                onClick={handleStart}
              >
                <Play className="mr-2 h-4 w-4" />
                Resume
              </Button>
            )}
            
            {timerState.status !== 'idle' && (
              <Button 
                variant="outline" 
                size="lg"
                onClick={handleReset}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            )}
          </div>

          {timerState.status === 'break' && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Coffee className="mr-2 h-4 w-4" />
              Take a well-deserved break!
            </div>
          )}

          {selectedTask && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">
                Current Task: {selectedTask.title}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};