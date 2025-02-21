import React from "react";
import { createRoot } from "react-dom/client";
import { Timer } from '@/components/Timer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, ListTodo, BarChart3 } from 'lucide-react';
import "../styles/global.css";
import "./popup.css";

const App = () => {
  return (
    <div className="w-80 min-h-[400px] bg-background p-2">
      <Tabs defaultValue="timer" className="h-full">
        <TabsList className="grid w-full grid-cols-3">
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
        </TabsList>
        
        <TabsContent value="timer" className="mt-4 h-full">
          <Timer />
        </TabsContent>
        
        <TabsContent value="tasks" className="mt-4">
          {/* Task list component will go here */}
          <div className="text-center text-muted-foreground">
            Tasks coming soon...
          </div>
        </TabsContent>
        
        <TabsContent value="stats" className="mt-4">
          {/* Stats component will go here */}
          <div className="text-center text-muted-foreground">
            Statistics coming soon...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const container = document.createElement("div");
document.body.appendChild(container);
const root = createRoot(container);
root.render(<App />);
