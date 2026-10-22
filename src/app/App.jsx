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
  const { tabs, next, prev, goto } = useTab();
  const { resetSettings } = useSettings();
  const [menuPosition, setMenuPosition] = useState(null);
  const [sidebarHidden, setSidebarHidden] = useState(false);

  /**
   * Bật/tắt hoàn toàn sidebar (khác với `collapse` chỉ thu gọn lại).
   * State nằm ở App vì cả context menu, phím tắt lẫn panel header
   * đều cần điều khiển sidebar.
   */
  const toggleSidebar = useCallback(() => {
    setSidebarHidden((hidden) => !hidden);
  }, []);

  useShortcuts({ onToggleSidebar: toggleSidebar });

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
        toggleSidebar,
        sidebarHidden,
      }),
    [next, prev, goto, resetSettings, indexOfTab, toggleSidebar, sidebarHidden],
  );

  return (
    <div className="app-body" onContextMenu={openMenu}>
      <Sidebar hidden={sidebarHidden} />
      <Panel sidebarHidden={sidebarHidden} onShowSidebar={toggleSidebar} />
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
