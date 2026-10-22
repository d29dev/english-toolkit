/**
 * Sự kiện phát ra khi cần mở menu ngữ cảnh.
 * Dùng CustomEvent trên document để lớp layout không phải chia sẻ state.
 */
export const CONTEXT_MENU_EVENT = "app:context-menu";

/**
 * Các hành động menu ngữ cảnh dùng chung cho toàn panel.
 * `shortcut` là chuỗi hiển thị (không phải binding thật) — binding thật
 * nằm ở core/hooks/useShortcuts.js.
 */
export function buildMenuItems({
  next,
  prev,
  goto,
  resetSettings,
  toggleSidebar,
  sidebarHidden = false,
  index,
}) {
  return [
    {
      id: "next",
      label: "Next tool",
      shortcut: "Ctrl + →",
      run: next,
    },
    {
      id: "prev",
      label: "Previous tool",
      shortcut: "Ctrl + ←",
      run: prev,
    },
    { type: "separator", id: "sep-nav" },
    {
      id: "home",
      label: "Go to Home",
      run: () => goto(index("Home")),
    },
    {
      id: "settings",
      label: "Open Settings",
      run: () => goto(index("Settings")),
    },
    { type: "separator", id: "sep-doc" },
    {
      id: "copy",
      label: "Copy selection",
      shortcut: "Ctrl + C",
      run: () => document.execCommand?.("copy"),
    },
    {
      id: "clear-selection",
      label: "Clear selection",
      run: () => window.getSelection()?.removeAllRanges(),
    },
    { type: "separator", id: "sep-view" },
    {
      id: "toggle-sidebar",
      label: sidebarHidden ? "Show sidebar" : "Hide sidebar completely",
      shortcut: "Ctrl + B",
      run: toggleSidebar,
    },
    { type: "separator", id: "sep-reset" },
    {
      id: "reset",
      label: "Reset settings",
      danger: true,
      run: resetSettings,
    },
  ];
}
