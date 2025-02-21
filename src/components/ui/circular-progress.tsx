import * as React from "react";
import { cn } from "@/lib/utils";

interface CircularProgressProps {
  value: number;
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export const CircularProgress = React.forwardRef<
  SVGSVGElement,
  CircularProgressProps
>((props, ref) => {
  const { value = 0, className, size = 200, strokeWidth = 8, ...other } = props;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference.toFixed(3);
  const strokeDashoffset = (((100 - value) / 100) * circumference).toFixed(3);

  return (
    <svg
      className={cn(
        "transform -rotate-90 transition-all duration-200",
        className
      )}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      ref={ref}
      {...other}
    >
      {/* Background circle */}
      <circle
        className="text-primary/20"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        fill="none"
        stroke="currentColor"
      />
      {/* Progress circle */}
      <circle
        className="text-primary transition-all duration-200 ease-in-out"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        fill="none"
        stroke="currentColor"
        strokeLinecap={"round" as const}
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
      />
    </svg>
  );
});

CircularProgress.displayName = "CircularProgress";
