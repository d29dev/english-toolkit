export const APP_VERSION = "1.0.0";

export const WS_URL =
  (typeof import.meta.env?.VITE_WS_URL === "string" &&
    import.meta.env.VITE_WS_URL) ||
  "ws://127.0.0.1:8000/ws/transcribe";

export function isChromeExtension() {
  return typeof chrome !== "undefined" && !!chrome.storage;
}
