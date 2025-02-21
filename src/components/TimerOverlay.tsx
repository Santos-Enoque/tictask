import React, { useEffect, useState } from "react";
import { Play, Pause } from "lucide-react";

interface TimerOverlayProps {
  timeRemaining: number;
  status: "idle" | "running" | "paused" | "break";
  onPause: () => void;
  onResume: () => void;
}

export const TimerOverlay: React.FC<TimerOverlayProps> = ({
  timeRemaining,
  status,
  onPause,
  onResume,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`
          flex items-center gap-2 px-4 py-2 
          bg-background/80 backdrop-blur-sm
          border rounded-lg shadow-sm
          transition-opacity duration-200
          ${isHovered ? "opacity-100" : "opacity-30"}
        `}
      >
        <div className="text-lg font-medium tabular-nums">
          {formatTime(timeRemaining)}
        </div>
        <button
          onClick={status === "running" ? onPause : onResume}
          className="p-1 hover:bg-accent rounded-md"
        >
          {status === "running" ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
};
