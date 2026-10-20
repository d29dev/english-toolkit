import { useContext } from "react";
import { TabContext } from "@/core/providers/contexts";

export function useTab() {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error("useTab must be used within TabProvider");
  return ctx;
}
