// src/components/Settings/Settings.tsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { TimerConfig } from '@/types';
import { Bell } from 'lucide-react';

interface SettingsProps {
  onSave?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onSave }) => {
  const [config, setConfig] = useState<TimerConfig & { notifications: boolean }>({
    pomoDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    notifications: true
  });

  useEffect(() => {
    // Load current settings
    chrome.storage.sync.get(['timerConfig', 'notifications'], (result) => {
      if (result.timerConfig) {
        setConfig({
          ...result.timerConfig,
          notifications: result.notifications !== false
        });
      }
    });
  }, []);

  const handleSave = async () => {
    // Convert minutes to seconds for storage
    const configToSave = {
      ...config,
      pomoDuration: config.pomoDuration * 60,
      shortBreakDuration: config.shortBreakDuration * 60,
      longBreakDuration: config.longBreakDuration * 60
    };

    await chrome.storage.sync.set({
      timerConfig: configToSave,
      notifications: config.notifications
    });

    if (onSave) onSave();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timer Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pomoDuration">Focus Duration (minutes)</Label>
            <Input
              id="pomoDuration"
              type="number"
              min="1"
              max="60"
              value={config.pomoDuration}
              onChange={(e) => setConfig({
                ...config,
                pomoDuration: parseInt(e.target.value) || 25
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortBreak">Short Break Duration (minutes)</Label>
            <Input
              id="shortBreak"
              type="number"
              min="1"
              max="30"
              value={config.shortBreakDuration}
              onChange={(e) => setConfig({
                ...config,
                shortBreakDuration: parseInt(e.target.value) || 5
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="longBreak">Long Break Duration (minutes)</Label>
            <Input
              id="longBreak"
              type="number"
              min="1"
              max="60"
              value={config.longBreakDuration}
              onChange={(e) => setConfig({
                ...config,
                longBreakDuration: parseInt(e.target.value) || 15
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interval">Long Break Interval (pomodoros)</Label>
            <Input
              id="interval"
              type="number"
              min="1"
              max="10"
              value={config.longBreakInterval}
              onChange={(e) => setConfig({
                ...config,
                longBreakInterval: parseInt(e.target.value) || 4
              })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="notifications"
              checked={config.notifications}
              onCheckedChange={(checked) => setConfig({
                ...config,
                notifications: checked
              })}
            />
            <Label htmlFor="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Enable Notifications
            </Label>
          </div>
        </div>

        <Button className="w-full" onClick={handleSave}>
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
};