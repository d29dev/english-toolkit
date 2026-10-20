import { isChromeExtension } from "@/config/env";

const STORAGE_KEY = "lookup-data";
const LIMITS = { history: 20 };

const EMPTY = { history: [], favorites: [] };

function shape(raw) {
  return {
    history: Array.isArray(raw?.history) ? raw.history : [],
    favorites: Array.isArray(raw?.favorites) ? raw.favorites : [],
  };
}

/** Lịch sử tra + danh sách yêu thích, lưu tách khỏi settings. */
export const lookupStorage = {
  async get() {
    if (isChromeExtension()) {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      return shape(result[STORAGE_KEY]);
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return shape(raw ? JSON.parse(raw) : null);
    } catch {
      return { ...EMPTY };
    }
  },

  async set(data) {
    if (isChromeExtension()) {
      await chrome.storage.local.set({ [STORAGE_KEY]: data });
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  /** Thêm một lần tra vào đầu lịch sử, khử trùng lặp, giới hạn số lượng. */
  pushHistory(data, entry) {
    const history = [
      entry,
      ...data.history.filter((item) => item.word !== entry.word),
    ].slice(0, LIMITS.history);

    return { ...data, history };
  },

  /** Bật/tắt yêu thích. Trả về dữ liệu mới. */
  toggleFavorite(data, entry) {
    const exists = data.favorites.some((item) => item.word === entry.word);

    return {
      ...data,
      favorites: exists
        ? data.favorites.filter((item) => item.word !== entry.word)
        : [entry, ...data.favorites],
    };
  },
};
