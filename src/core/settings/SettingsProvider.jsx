import { SettingsContext } from "@/core/providers/contexts";
import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_SETTINGS,
  coerceSetting,
  getSettingSpec,
} from "./schema";
import { settingsStorage } from "./storage";

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    settingsStorage
      .get()
      .then((saved) => {
        if (active) {
          setSettings(saved);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  // Áp settings lên root: theme, cỡ chữ, compact
  useEffect(() => {
    const root = document.documentElement;
    const { theme, fontSize, compactMode } = settings.appearance;

    root.dataset.theme = theme;
    root.dataset.compact = String(compactMode);
    root.style.colorScheme = theme === "system" ? "light dark" : theme;
    root.style.setProperty("--font-size", `${fontSize}px`);
  }, [settings]);

  /**
   * Ghi một setting. Giá trị được kiểm tra theo schema — sai kiểu/miền
   * sẽ bị từ chối và trả về false để UI có thể phản hồi.
   */
  const updateSetting = useCallback(
    async (group, key, value) => {
      const spec = getSettingSpec(group, key);
      if (!spec) {
        console.warn(`Unknown setting: ${group}.${key}`);
        return false;
      }

      const coerced = coerceSetting(spec, value);
      if (coerced === undefined) {
        console.warn(`Invalid value for ${group}.${key}:`, value);
        return false;
      }

      const next = {
        ...settings,
        [group]: {
          ...settings[group],
          [key]: coerced,
        },
      };

      setSettings(next);

      try {
        await settingsStorage.set(next);
      } catch (error) {
        console.error("Cannot save settings:", error);
      }

      return true;
    },
    [settings],
  );

  /** Ghi nhiều setting cùng lúc; giá trị không hợp lệ bị bỏ qua. */
  const updateMany = useCallback(
    async (patch) => {
      let next;

      setSettings((current) => {
        next = structuredClone(current);

        for (const [group, values] of Object.entries(patch ?? {})) {
          if (!values || typeof values !== "object") continue;

          for (const [key, value] of Object.entries(values)) {
            const spec = getSettingSpec(group, key);
            if (!spec) continue;

            const coerced = coerceSetting(spec, value);
            if (coerced !== undefined) next[group][key] = coerced;
          }
        }

        return next;
      });

      try {
        await settingsStorage.set(next);
      } catch (error) {
        console.error("Cannot save settings:", error);
      }

      return true;
    },
    [],
  );

  const resetSettings = useCallback(async () => {
    const defaults = await settingsStorage.reset();
    setSettings(defaults);
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loaded,
        updateSetting,
        updateMany,
        resetSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
