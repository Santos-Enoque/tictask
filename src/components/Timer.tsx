// src/components/Timer/Timer.tsx
import React, { useEffect, useState } from 'react';
import { TimerService, TimerState } from '@/lib/services/timerService';
import { StorageService } from '@/lib/services/storageService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, RotateCcw, Coffee } from 'lucide-react';

export const Timer: React.FC = () => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [timerService] = useState(() => new TimerService());
  const [storageService] = useState(() => StorageService.getInstance());

  useEffect(() => {
    const loadConfig = async () => {
      const config = await storageService.getTimerConfig();
      timerService.reset();
    };
    loadConfig();

    timerService.on('tick', (time: number) => {
      setTimeRemaining(time);
      // Calculate progress percentage
      const total = timerState === 'break' ? 5 * 60 : 25 * 60; // 5 or 25 minutes in seconds
      setProgress(((total - time) / total) * 100);
    });
    
    timerService.on('stateChange', (state: TimerState) => setTimerState(state));
    timerService.on('pomodoroComplete', async (count: number) => {
      await storageService.saveSession({
        id: Date.now().toString(),
        startTime: Date.now() - 25 * 60 * 1000,
        endTime: Date.now(),
        type: 'pomodoro',
        completed: true
      });
    });

    return () => {
      timerService.removeAllListeners();
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStart = () => timerService.start();
  const handlePause = () => timerService.pause();
  const handleReset = () => timerService.reset();

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl">Focus Timer</CardTitle>
          <Badge 
            variant={timerState === 'break' ? 'secondary' : 'default'}
            className="capitalize"
          >
            {timerState === 'break' ? 'Break Time' : 'Focus Time'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-6xl font-bold tabular-nums">
            {formatTime(timeRemaining)}
          </div>
          
          <Progress value={progress} className="w-full" />

          <div className="flex justify-center space-x-2">
            {timerState === 'idle' && (
              <Button 
                variant="default" 
                size="lg"
                onClick={handleStart}
              >
                <Play className="mr-2 h-4 w-4" />
                Start
              </Button>
            )}
            
            {timerState === 'running' && (
              <Button 
                variant="secondary" 
                size="lg"
                onClick={handlePause}
              >
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
            )}
            
            {timerState === 'paused' && (
              <Button 
                variant="default" 
                size="lg"
                onClick={handleStart}
              >
                <Play className="mr-2 h-4 w-4" />
                Resume
              </Button>
            )}
            
            {timerState !== 'idle' && (
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

          {timerState === 'break' && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Coffee className="mr-2 h-4 w-4" />
              Take a well-deserved break!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};