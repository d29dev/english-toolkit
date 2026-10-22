import { useEffect } from "react";
import { useTab } from "@/core/hooks/useTab";

/**
 * Lắng nghe phím tắt của app:
 *   Ctrl+→/↓ (next), Ctrl+←/↑ (prev), Ctrl+B (bật/tắt sidebar hoàn toàn).
 *
 * `onToggleSidebar` là tuỳ chọn — nếu không truyền thì Ctrl+B bị bỏ qua.
 */
export function useShortcuts({ onToggleSidebar } = {}) {
  const { next, prev } = useTab();

  useEffect(() => {
    const handleKeydown = (e) => {
      if (!e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        next();
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        prev();
        return;
      }

      if (onToggleSidebar && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        onToggleSidebar();
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [next, prev, onToggleSidebar]);
}
