import { useCallback, useMemo, useState } from "react";

import { ALWAYS_ON_TABS } from "@/core/settings/schema";
import { useSettings } from "@/core/settings/useSettings";
import { TabContext } from "./contexts";

/** Tab này có được bật không? Home/Settings luôn bật. */
function isEnabled(tab, hidden) {
  if (ALWAYS_ON_TABS.includes(tab.title)) return true;
  return !hidden.includes(tab.title);
}

/**
 * Tab đang mở được lưu bằng **tiêu đề**, không phải index.
 *
 * Index vào danh sách đang hiển thị rất dễ "trôi": tắt Translate trong
 * [Realtime, Translate, Home, …] thì Home tụt từ index 2 xuống 1, và nếu
 * giữ index cũ người dùng bị nhảy sang Lookup. Lưu tiêu đề thì panel vẫn
 * đứng đúng chỗ, chỉ khi chính tab đó bị tắt mới phải rời đi.
 */
function resolveIndex(title, tabs) {
  if (tabs.length === 0) return -1;
  const index = tabs.findIndex((tab) => tab.title === title);
  return index === -1 ? 0 : index;
}

export function TabProvider({ tabs, children }) {
  const { settings, updateSetting } = useSettings();

  // `settings.features.hidden` đổi identity mỗi render -> memo hoá để
  // các useMemo/useCallback bên dưới không bị tính lại vô ích.
  const hiddenKey = settings.features?.hidden?.join("\u0000") ?? "";
  const hidden = useMemo(() => (hiddenKey ? hiddenKey.split("\u0000") : []), [hiddenKey]);

  // Tab đang bật, giữ nguyên thứ tự trong registry
  const visibleTabs = useMemo(
    () => tabs.filter((tab) => isEnabled(tab, hidden)),
    [tabs, hidden],
  );

  const [currentTitle, setCurrentTitle] = useState(() => tabs[0]?.title ?? null);

  // Suy ra index ngay khi render — không cần effect, không render thừa.
  const currentTab = resolveIndex(currentTitle, visibleTabs);

  // Tab đang mở không còn trong danh sách (vừa bị tắt) -> rơi về tab đầu.
  const currentIsVisible = visibleTabs.some((tab) => tab.title === currentTitle);
  if (visibleTabs.length > 0 && !currentIsVisible) {
    setCurrentTitle(visibleTabs[0].title);
  }

  const goto = useCallback(
    (index) => {
      const target = visibleTabs[index];
      if (target) setCurrentTitle(target.title);
    },
    [visibleTabs],
  );

  const next = useCallback(
    () =>
      setCurrentTitle((title) => {
        const index = resolveIndex(title, visibleTabs);
        return visibleTabs.length === 0
          ? title
          : visibleTabs[(index + 1) % visibleTabs.length].title;
      }),
    [visibleTabs],
  );

  const prev = useCallback(
    () =>
      setCurrentTitle((title) => {
        const index = resolveIndex(title, visibleTabs);
        return visibleTabs.length === 0
          ? title
          : visibleTabs[(index - 1 + visibleTabs.length) % visibleTabs.length].title;
      }),
    [visibleTabs],
  );

  /** Bật/tắt một tab theo tiêu đề. Home/Settings không tắt được. */
  const toggleTab = useCallback(
    (title) => {
      if (ALWAYS_ON_TABS.includes(title)) return Promise.resolve(false);

      const next = hidden.includes(title)
        ? hidden.filter((item) => item !== title)
        : [...hidden, title];

      return updateSetting("features", "hidden", next);
    },
    [hidden, updateSetting],
  );

  const value = useMemo(
    () => ({
      // `tabs` chỉ gồm tab đang bật; registry đầy đủ nằm ở `allTabs`
      tabs: visibleTabs,
      allTabs: tabs,
      currentTab,
      hidden,
      goto,
      next,
      prev,
      toggleTab,
      isEnabled: (title) => !hidden.includes(title) || ALWAYS_ON_TABS.includes(title),
    }),
    [visibleTabs, tabs, currentTab, hidden, goto, next, prev, toggleTab],
  );

  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}
