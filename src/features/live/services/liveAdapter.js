import { WS_URL } from "@/config/env";

export class LiveAdapterError extends Error {
  constructor(message, code = "unknown") {
    super(message);
    this.name = "LiveAdapterError";
    this.code = code;
  }
}

/**
 * @typedef {Object} LiveAdapter
 * @property {(language?: string) => Promise<void>} connect
 * @property {(language: string) => void} setLanguage
 * @property {(float32: Float32Array) => void} sendAudio
 * @property {() => void} disconnect
 * @property {(event: string, fn: Function) => () => void} on
 */

/**
 * WebSocket adapter mặc định, tương thích với backend Whisper hiện tại
 */
export function createWebSocketAdapter({ url = WS_URL } = {}) {
  let ws = null;
  const handlers = {};

  const emit = (event, payload) => {
    const list = handlers[event];
    if (!list) return;
    list.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error("[LiveAdapter] handler error", err);
      }
    });
  };

  const on = (event, fn) => {
    if (typeof fn !== "function") return () => {};
    (handlers[event] ||= []).push(fn);
    return () => {
      if (!handlers[event]) return;
      handlers[event] = handlers[event].filter((f) => f !== fn);
    };
  };

  const connect = (language = "vi") => {
    return new Promise((resolve, reject) => {
      try {
        const socket = new WebSocket(url);
        socket.binaryType = "arraybuffer";

        socket.onopen = () => {
          ws = socket;
          try {
            if (language) {
              socket.send(JSON.stringify({ type: "config", language }));
            }
          } catch (err) {
            console.warn("[LiveAdapter] failed to send initial config", err);
          }
          resolve();
        };

        socket.onerror = () => {
          reject(new LiveAdapterError("Không kết nối được WebSocket", "network"));
        };

        socket.onclose = (e) => {
          ws = null;
          emit("close", { code: e.code, reason: e.reason });
        };

        socket.onmessage = (ev) => {
          let msg;
          try {
            msg = typeof ev.data === "string" ? JSON.parse(ev.data) : null;
          } catch {
            return;
          }
          if (msg && msg.type) {
            emit(msg.type, msg);
          }
        };
      } catch (err) {
        reject(new LiveAdapterError(err?.message || "Lỗi khởi tạo WebSocket", "unknown"));
      }
    });
  };

  const setLanguage = (language) => {
    if (ws?.readyState === WebSocket.OPEN && language) {
      try {
        ws.send(JSON.stringify({ type: "config", language }));
      } catch (err) {
        console.warn("[LiveAdapter] failed to set language", err);
      }
    }
  };

  const sendAudio = (float32) => {
    if (!float32) return;
    if (ws?.readyState === WebSocket.OPEN) {
      try {
        // Gửi buffer PCM Float32 mono
        ws.send(float32.buffer);
      } catch (err) {
        console.warn("[LiveAdapter] failed to send audio", err);
      }
    }
  };

  const disconnect = () => {
    if (ws && ws.readyState <= WebSocket.OPEN) {
      try {
        ws.close();
      } catch {}
    }
    ws = null;
  };

  return {
    connect,
    setLanguage,
    sendAudio,
    disconnect,
    on,
  };
}

// Adapter hiện tại đang dùng
let currentAdapter = createWebSocketAdapter();

export function getLiveAdapter() {
  return currentAdapter;
}

export function setLiveAdapter(adapter) {
  if (!adapter || typeof adapter.connect !== "function") {
    throw new Error("setLiveAdapter: adapter không hợp lệ");
  }
  currentAdapter = adapter;
}
