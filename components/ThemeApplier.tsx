"use client";
import { useEffect } from "react";

export function ThemeApplier({ theme }: { theme: string }) {
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light" || theme === "dark") {
      root.dataset.theme = theme;
    } else {
      delete root.dataset.theme;
    }
    return () => {
      delete root.dataset.theme;
    };
  }, [theme]);

  return null;
}
