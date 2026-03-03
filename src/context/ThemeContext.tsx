"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface ThemeContextType {
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  setTheme: () => {},
});

export function ThemeProvider({ children, initialTheme }: { children: React.ReactNode; initialTheme?: string }) {
  const [theme, setThemeState] = useState<"light" | "dark">(
    (initialTheme === "dark" ? "dark" : undefined) ??
    (typeof window !== "undefined" ? (localStorage.getItem("theme") as "light" | "dark" | null) ?? "light" : "light")
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const setTheme = (t: "light" | "dark") => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}


