import { useEffect, useLayoutEffect, useRef, useState } from "react";

const MARGIN = 8;

/**
 * Menu ngữ cảnh dùng chung cho toàn panel.
 *
 * Không tự gắn listener chuột phải — component cha (App) sở hữu việc đó và
 * truyền `position` + `items`. `onClose` được gọi khi chọn item, Esc,
 * click ra ngoài, hoặc khi panel cuộn/đổi kích thước.
 */
export default function ContextMenu({ position, items = [], onClose }) {
  const menuRef = useRef(null);
  const [coords, setCoords] = useState(position ?? { x: 0, y: 0 });

  // Giữ menu trong viewport sau khi đo kích thước thật
  useLayoutEffect(() => {
    if (!position || !menuRef.current) return;

    const { offsetWidth: width, offsetHeight: height } = menuRef.current;
    const maxX = window.innerWidth - width - MARGIN;
    const maxY = window.innerHeight - height - MARGIN;

    setCoords({
      x: Math.max(MARGIN, Math.min(position.x, maxX)),
      y: Math.max(MARGIN, Math.min(position.y, maxY)),
    });
  }, [position]);

  useEffect(() => {
    if (!position) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;

      e.preventDefault();
      const options = [
        ...menuRef.current.querySelectorAll("[role='menuitem']:not(:disabled)"),
      ];
      if (options.length === 0) return;

      const current = options.indexOf(document.activeElement);
      const last = options.length - 1;
      let next = current;

      if (e.key === "ArrowDown") next = current >= last ? 0 : current + 1;
      if (e.key === "ArrowUp") next = current <= 0 ? last : current - 1;
      if (e.key === "Home") next = 0;
      if (e.key === "End") next = last;

      options[next].focus();
    };

    // Đóng khi cuộn hoặc resize để không "trôi" khỏi vị trí
    const onScrollOrResize = () => onClose();

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("blur", onScrollOrResize);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("blur", onScrollOrResize);
    };
  }, [position, onClose]);

  // Focus item đầu tiên để dùng được ngay bằng bàn phím
  useEffect(() => {
    if (!position) return;
    menuRef.current
      ?.querySelector("[role='menuitem']:not(:disabled)")
      ?.focus();
  }, [position]);

  if (!position) return null;

  const handleSelect = (item) => {
    onClose();
    item.run?.();
  };

  return (
    <div className="context-overlay" onMouseDown={onClose} onContextMenu={(e) => e.preventDefault()}>
      <div
        ref={menuRef}
        className="contextmenu"
        role="menu"
        aria-label="Panel actions"
        style={{ left: coords.x, top: coords.y }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {items.map((item) =>
          item.type === "separator" ? (
            <div className="contextmenu-separator" role="separator" key={item.id} />
          ) : (
            <button
              type="button"
              role="menuitem"
              key={item.id}
              className={`contextmenu-item${item.danger ? " contextmenu-item-danger" : ""}`}
              onClick={() => handleSelect(item)}
            >
              <span>{item.label}</span>
              {item.shortcut && <kbd>{item.shortcut}</kbd>}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
