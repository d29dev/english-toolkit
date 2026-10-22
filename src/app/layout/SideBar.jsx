import { useState } from "react";

import { useTab } from "@/core/hooks/useTab";

/**
 * Sidebar điều hướng.
 *
 * `hidden` do App sở hữu: context menu, phím tắt và nút trong panel header
 * đều bật/tắt sidebar từ bên ngoài component này, nên state không thể nằm
 * trong SideBar.
 */
export default function SideBar({ hidden = false }) {
  const [collapsed, setCollapsed] = useState(false);
  const { currentTab, goto, tabs } = useTab();

  const renderTab = (tab, index) => {
    const Icon = tab.icon;

    return (
      <button
        className={currentTab === index ? "active" : ""}
        onClick={() => goto(index)}
        key={index}
      >
        <Icon />
        <span>{tab.title}</span>
      </button>
    );
  };

  return (
    <div className={`sidebar${collapsed ? " collapse" : ""}${hidden ? " hide" : ""}`}>
      <button
        className="sidebar-collapse"
        onClick={() => setCollapsed((value) => !value)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <div className="bars"></div>
      </button>

      <div className="sidebar-menu">
        {tabs.map((tab, index) =>
          !tab.bottom ? renderTab(tab, index) : null
        )}
      </div>

      <div className="sidebar-footer">
        {tabs.map((tab, index) =>
          tab.bottom ? renderTab(tab, index) : null
        )}
      </div>
    </div>
  );
}
