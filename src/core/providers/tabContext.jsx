import { useMemo, useState } from "react";
import { TabContext } from "./contexts";

export function TabProvider({ tabs, children }) {
  const [currentTab, setCurrentTab] = useState(0);

  const value = useMemo(
    () => ({
      tabs,
      currentTab,
      goto: setCurrentTab,
      next: () => setCurrentTab((p) => (p + 1) % tabs.length),
      prev: () => setCurrentTab((p) => (p - 1 + tabs.length) % tabs.length),
    }),
    [tabs, currentTab],
  );

  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}
