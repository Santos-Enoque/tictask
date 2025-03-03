import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>("system");

  // Load the theme from Chrome storage when component mounts
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const result = await chrome.storage.sync.get("theme");
        if (
          result.theme &&
          (result.theme === "light" ||
            result.theme === "dark" ||
            result.theme === "system")
        ) {
          setThemeState(result.theme as Theme);
        }
      } catch (error) {
        console.error("Failed to load theme:", error);
      }
    };

    loadTheme();
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    // Store in Chrome storage for persistence
    chrome.storage.sync.set({ theme: newTheme });
  };

  useEffect(() => {
    const applyTheme = () => {
      let effectiveTheme = theme;

      if (theme === "system") {
        effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "dark"
          : "light";
      }

      document.documentElement.setAttribute("data-theme", effectiveTheme);

      if (effectiveTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    applyTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme();
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
