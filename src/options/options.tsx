import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/components/ThemeProvider";
import "../styles/global.css";
import "./options.css";

const Options = () => {
  return (
    <ThemeProvider>
      <div>
        <p>Options</p>
      </div>
    </ThemeProvider>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<Options />);
