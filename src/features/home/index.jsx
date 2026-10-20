import { useTab } from "@/core/hooks/useTab";

export default function HomePanel() {
  const { tabs, currentTab, goto } = useTab();

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
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          return (
            <button
              type="button"
              className={`card${index === currentTab ? " card-active" : ""}`}
              key={tab.title}
              onClick={() => goto(index)}
            >
              <span className="card-icon">
                <Icon />
              </span>
              <span className="card-title">{tab.title}</span>
              <span className="card-desc">{tab.description}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
