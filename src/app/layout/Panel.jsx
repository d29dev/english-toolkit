import { useTab } from "@/core/hooks/useTab";
import { APP_VERSION } from "@/config/env";

export default function Panel() {
  const { currentTab, tabs } = useTab();
  const tab = tabs[currentTab];
  const PanelContent = tab.content;
  const Icon = tab.icon;

  return (
    <div className="panel">
      <header className="panel-header">
        <div className="panel-heading">
          <span className="panel-heading-icon">
            <Icon />
          </span>
          <div>
            <h1>{tab.title}</h1>
            <p>{tab.description}</p>
          </div>
        </div>
        <span className="badge badge-soft">v{APP_VERSION}</span>
      </header>
      <PanelContent />
    </div>
  );
}
