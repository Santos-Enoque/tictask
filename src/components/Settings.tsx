// src/components/Settings/Settings.tsx
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TimerConfig } from "@/db/schema";
import { Bell } from "lucide-react";
import { storage } from "@/db/local";

interface SettingsProps {
  onSave?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onSave }) => {
  const [config, setConfig] = useState<
    TimerConfig & { notifications: boolean }
  >({
    id: "default",
    pomoDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    notifications: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const timerConfig = await storage.getTimerConfig();
        // Get notifications setting from chrome storage since it's a browser-level setting
        const { notifications } = await chrome.storage.sync.get(
          "notifications"
        );

        setConfig({
          ...timerConfig,
          // Convert seconds to minutes for display
          pomoDuration: Math.floor(timerConfig.pomoDuration / 60),
          shortBreakDuration: Math.floor(timerConfig.shortBreakDuration / 60),
          longBreakDuration: Math.floor(timerConfig.longBreakDuration / 60),
          notifications: notifications !== false,
        });
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Ensure all values are valid numbers
      const validConfig = {
        id: "default",
        pomoDuration: Math.max(1, Number(config.pomoDuration) || 25) * 60, // Convert to seconds
        shortBreakDuration:
          Math.max(1, Number(config.shortBreakDuration) || 5) * 60,
        longBreakDuration:
          Math.max(1, Number(config.longBreakDuration) || 15) * 60,
        longBreakInterval: Math.max(1, Number(config.longBreakInterval) || 4),
      };

      // Save timer config using our storage system
      await storage.saveTimerConfig(validConfig);

      // Notify other components about the config change
      await chrome.runtime.sendMessage({
        type: "CONFIG_CHANGED",
        config: validConfig,
      });

      // Only notifications setting goes to chrome.storage.sync
      await chrome.storage.sync.set({
        notifications: config.notifications,
      });

      if (onSave) onSave();
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (
    field: keyof TimerConfig,
    value: string,
    defaultValue: number
  ) => {
    const numValue = value === "" ? "" : parseInt(value);
    setConfig({
      ...config,
      [field]: numValue === "" ? "" : Math.max(1, numValue || defaultValue),
    });
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
              onChange={(e) =>
                handleInputChange("pomoDuration", e.target.value, 25)
              }
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
              onChange={(e) =>
                handleInputChange("shortBreakDuration", e.target.value, 5)
              }
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
              onChange={(e) =>
                handleInputChange("longBreakDuration", e.target.value, 15)
              }
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
              onChange={(e) =>
                handleInputChange("longBreakInterval", e.target.value, 4)
              }
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="notifications"
              checked={config.notifications}
              onCheckedChange={(checked) =>
                setConfig({
                  ...config,
                  notifications: checked,
                })
              }
            />
            <Label htmlFor="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Enable Notifications
            </Label>
          </div>
        </div>

        <Button className="w-full" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
