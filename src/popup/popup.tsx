import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Timer } from "@/components/Timer";
import { TaskList } from "@/components/TaskList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, ListTodo, BarChart3, SettingsIcon } from "lucide-react";
import { Settings } from "@/components/Settings";
import { ThemeProvider } from "@/components/ThemeProvider";
import "../styles/global.css";
import "../styles/datepicker.css";
import "./popup.css";
import { Stats } from "@/components/Stats";

const App = () => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("timer");

  const handleTaskComplete = () => {
    setSelectedTaskId(null);
  };

  const handleSwitchToTimer = () => {
    setActiveTab("timer");
  };

  const handleSettingsSave = () => {
    // Reload timer state after settings change
    chrome.runtime.sendMessage({ type: "GET_TIMER_STATE" });
  };

  return (
    <div className="w-[400px] min-h-[550px] bg-background p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timer" className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            Timer
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center">
            <ListTodo className="mr-2 h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center">
            <BarChart3 className="mr-2 h-4 w-4" />
            Stats
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center">
            <SettingsIcon className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timer" className="mt-4 h-full">
          <Timer
            selectedTaskId={selectedTaskId}
            onTaskComplete={handleTaskComplete}
          />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <TaskList
            selectedTaskId={selectedTaskId}
            onTaskSelect={setSelectedTaskId}
            onTaskSelected={handleSwitchToTimer}
          />
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <Stats />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Settings onSave={handleSettingsSave} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const container = document.createElement("div");
document.body.appendChild(container);
const root = createRoot(container);
root.render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
