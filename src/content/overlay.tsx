import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { TimerOverlay } from "@/components/TimerOverlay";

const OverlayApp = () => {
  const [timerState, setTimerState] = useState({
    timeRemaining: 0,
    status: "idle" as "idle" | "running" | "paused" | "break",
  });

  useEffect(() => {
    const handleTimerUpdate = (message: any) => {
      if (message.type === "TIMER_UPDATE") {
        setTimerState(message.state);
      }
    };

    chrome.runtime.onMessage.addListener(handleTimerUpdate);
    return () => {
      chrome.runtime.onMessage.removeListener(handleTimerUpdate);
    };
  }, []);

  const handlePause = () => {
    chrome.runtime.sendMessage({ type: "PAUSE_TIMER" });
  };

  const handleResume = () => {
    chrome.runtime.sendMessage({ type: "START_TIMER" });
  };

  // Only show overlay if timer is running or paused
  if (timerState.status === "idle" || timerState.status === "break") {
    return null;
  }

  return (
    <TimerOverlay
      timeRemaining={timerState.timeRemaining}
      status={timerState.status}
      onPause={handlePause}
      onResume={handleResume}
    />
  );
};

// Create container and render overlay
const container = document.createElement("div");
document.body.appendChild(container);
const root = createRoot(container);
root.render(<OverlayApp />);
