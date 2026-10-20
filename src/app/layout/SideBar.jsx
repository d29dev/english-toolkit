import { useState } from "react";

import { useTab } from "@/core/hooks/useTab";

export default function SideBar() {
  const [collapsed, setCollapsed] = useState(false)
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
    <div className={`sidebar ${collapsed ? "collapse" : ""}`}>
      <button className="sidebar-collapse" onClick={() => {setCollapsed(!collapsed)}}>
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
