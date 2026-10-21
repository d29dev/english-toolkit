import { useCallback, useMemo, useState } from "react";
import Sidebar from "./layout/SideBar";
import Panel from "./layout/Panel";
import ContextMenu from "./layout/ContextMenu";
import { buildMenuItems } from "./layout/contextMenuItems";
import { tabs } from "./tabs";
import { TabProvider } from "@/core/providers";
import { SettingsProvider } from "@/core/settings/SettingsProvider";
import { LookupProvider } from "@/features/lookup/LookupProvider";
import { AssistantProvider } from "@/features/assistant/AssistantProvider";
import { useSettings } from "@/core/settings/useSettings";
import { useShortcuts } from "@/core/hooks/useShortcuts";
import { useTab } from "@/core/hooks/useTab";
import "@/styles/variables.css";
import "@/styles/global.css";
import "@/styles/components.css";
import "@/styles/responsive.css";

function AppContent() {
  useShortcuts();

  const { tabs, next, prev, goto } = useTab();
  const { resetSettings } = useSettings();
  const [menuPosition, setMenuPosition] = useState(null);

  const openMenu = useCallback((e) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const closeMenu = useCallback(() => setMenuPosition(null), []);

  const indexOfTab = useCallback(
    (title) => tabs.findIndex((tab) => tab.title === title),
    [tabs],
  );

  const menuItems = useMemo(
    () =>
      buildMenuItems({
        next,
        prev,
        goto,
        resetSettings,
        index: indexOfTab,
      }),
    [next, prev, goto, resetSettings, indexOfTab],
  );

  return (
    <div className="app-body" onContextMenu={openMenu}>
      <Sidebar />
      <Panel />
      <ContextMenu position={menuPosition} items={menuItems} onClose={closeMenu} />
    </div>
  );
}

function App() {
  return (
    <div className="app">
      <SettingsProvider>
        <LookupProvider>
          <AssistantProvider>
            <TabProvider tabs={tabs}>
              <AppContent />
            </TabProvider>
          </AssistantProvider>
        </LookupProvider>
      </SettingsProvider>
    </div>
  );
}

export default App;
