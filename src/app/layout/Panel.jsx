import { useTab } from "@/core/hooks/useTab";
import { MenuIcon } from "@/core/components/Icons";
import { APP_VERSION } from "@/config/env";

/**
 * Nội dung panel bên phải.
 *
 * Khi sidebar bị ẩn hoàn toàn, header hiện một nút menu để bật lại —
 * nếu không, người dùng chỉ còn cách dùng chuột phải/phím tắt để gọi lại.
 */
export default function Panel({ sidebarHidden = false, onShowSidebar }) {
  const { currentTab, tabs } = useTab();
  const tab = tabs[currentTab];
  const PanelContent = tab.content;
  const Icon = tab.icon;

  return (
    <div className="panel">
      <header className="panel-header">
        <div className="panel-heading">
          {sidebarHidden && (
            <button
              type="button"
              className="panel-menu"
              onClick={onShowSidebar}
              title="Show sidebar (Ctrl + B)"
              aria-label="Show sidebar"
            >
              <MenuIcon />
            </button>
          )}
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
