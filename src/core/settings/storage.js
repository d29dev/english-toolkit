import { isChromeExtension } from "@/config/env";
import { DEFAULT_SETTINGS, sanitizeSettings } from "./schema";

const STORAGE_KEY = "app-settings";

function cloneDefaults() {
  return structuredClone(DEFAULT_SETTINGS);
}

export const settingsStorage = {
  async get() {
    if (isChromeExtension()) {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      return sanitizeSettings(result[STORAGE_KEY]);
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return sanitizeSettings(raw ? JSON.parse(raw) : {});
    } catch {
      return cloneDefaults();
    }
  },

  async set(settings) {
    if (isChromeExtension()) {
      await chrome.storage.local.set({
        [STORAGE_KEY]: settings,
      });

      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  },

  async reset() {
    const defaults = cloneDefaults();
    await this.set(defaults);
    return defaults;
  },
};
