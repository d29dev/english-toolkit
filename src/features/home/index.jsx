import { useTab } from "@/core/hooks/useTab";
import { ALWAYS_ON_TABS } from "@/core/settings/schema";

export default function HomePanel() {
  const { tabs, allTabs, currentTab, goto, toggleTab, isEnabled } = useTab();

  // Card hiển thị mọi tool trong registry (kể cả đang tắt) để còn bật lại.
  // Index dùng để `goto` phải là index trong danh sách đang hiển thị.
  const visibleTabs = tabs;

  return (
    <>
      <div className="hero">
        <h2>English Toolkit</h2>
        <p>Transcribe, translate and rewrite without leaving your tab.</p>
        <div className="chips">
          <span className="chip">Ctrl + Shift + E — open panel</span>
          <span className="chip">Ctrl + ← / → — switch tools</span>
        </div>
      </div>

      <h2 className="section-title">Tools</h2>

      <div className="container">
        {allTabs.map((tab) => {
          const Icon = tab.icon;
          const on = isEnabled(tab.title);
          const canToggle = !ALWAYS_ON_TABS.includes(tab.title);
          const active = on && visibleTabs[currentTab] === tab;

          return (
            <div
              className={`card${active ? " card-active" : ""}${on ? "" : " card-off"}`}
              key={tab.title}
            >
              <button
                type="button"
                className="card-main"
                onClick={() => {
                  const index = visibleTabs.indexOf(tab);
                  if (index !== -1) goto(index);
                }}
                disabled={!on}
                aria-label={`Open ${tab.title}`}
              >
                <span className="card-icon">
                  <Icon />
                </span>
                <span className="card-title">{tab.title}</span>
                <span className="card-desc">{tab.description}</span>
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${on ? "Turn off" : "Turn on"} ${tab.title}`}
                className={`card-toggle${on ? " is-on" : ""}`}
                disabled={!canToggle}
                title={canToggle ? undefined : `${tab.title} is always available`}
                onClick={() => toggleTab(tab.title)}
              >
                <span className="card-toggle-track" aria-hidden="true">
                  <span className="card-toggle-thumb" />
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
