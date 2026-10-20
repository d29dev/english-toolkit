import { useEffect } from "react";
import { useTab } from "@/core/hooks/useTab";

/** Lắng nghe phím tắt điều hướng tab: Ctrl+→/↓ (next), Ctrl+←/↑ (prev). */
export function useShortcuts() {
  const { next, prev } = useTab();

  useEffect(() => {
    const handleKeydown = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") prev();
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [next, prev]);
}
