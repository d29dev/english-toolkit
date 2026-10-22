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
 * @property {(language?: string) => Promise<void>} connect  resolve khi server gửi "ready"
 * @property {(language: string) => void} setLanguage
 * @property {(chunk: ArrayBuffer | Int16Array | Float32Array) => void} sendAudio
 * @property {() => Promise<boolean>} flush  chốt câu cuối; true nếu server đã xác nhận "flushed"
 * @property {() => void} disconnect
 * @property {(event: string, fn: Function) => () => void} on
 * @property {boolean} connected
 */

/**
 * Giao thức backend (server_npu_streaming.py, WS /ws/transcribe):
 *   client -> server : binary PCM16 mono 16 kHz  |  text {"type":"flush"}
 *   server -> client : {"type":"ready"}  {"type":"transcript", text, stable, partial, final, ...}
 *                      {"type":"flushed"}  {"type":"error", message}
 * WS_URL phải trỏ tới đường dẫn /ws/transcribe (hoặc /ws/audio), ví dụ ws://127.0.0.1:8000/ws/transcribe
 */

const READY_TIMEOUT_MS = 8000;
const FLUSH_TIMEOUT_MS = 4000;

/** Đưa mọi kiểu dữ liệu audio về ArrayBuffer PCM16 (little-endian) mà backend yêu cầu. */
function toPcm16(chunk) {
  if (!chunk) return null;
  if (chunk instanceof ArrayBuffer) return chunk;
  if (chunk instanceof Int16Array) {
    // Nếu là một "lát" của buffer lớn hơn thì phải sao chép, không thì gửi cả buffer.
    return chunk.byteOffset === 0 && chunk.byteLength === chunk.buffer.byteLength
      ? chunk.buffer
      : chunk.slice().buffer;
  }
  if (chunk instanceof Float32Array) {
    const out = new Int16Array(chunk.length);
    for (let i = 0; i < chunk.length; i++) {
      const v = Math.max(-1, Math.min(1, chunk[i]));
      out[i] = v < 0 ? v * 32768 : v * 32767;
    }
    return out.buffer;
  }
  return null;
}

/**
 * WebSocket adapter mặc định, khớp với backend Whisper streaming hiện tại.
 */
export function createWebSocketAdapter({ url = WS_URL } = {}) {
  let session = null; // { socket, ready, info }
  const handlers = {};
  let flushWaiters = [];

  const emit = (event, payload) => {
    const list = handlers[event];
    if (!list) return;
    list.slice().forEach((fn) => {
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

  const resolveFlushWaiters = (ok) => {
    const list = flushWaiters;
    flushWaiters = [];
    list.forEach((finish) => finish(ok));
  };

  const abandon = (s) => {
    if (session === s) session = null;
    try {
      s.socket.close();
    } catch {}
  };

  const disconnect = () => {
    const s = session;
    session = null; // đặt trước khi đóng: sự kiện close của socket này sẽ không bị báo ra ngoài
    resolveFlushWaiters(false);
    if (s && s.socket.readyState <= WebSocket.OPEN) {
      try {
        s.socket.close();
      } catch {}
    }
  };

  /** Promise resolve khi nhận "ready" (server đã nạp model, sẵn sàng nhận audio). */
  const connect = () =>
    new Promise((resolve, reject) => {
      disconnect(); // dọn kết nối cũ nếu còn

      let socket;
      try {
        socket = new WebSocket(url);
      } catch (err) {
        reject(new LiveAdapterError(err?.message || "Lỗi khởi tạo WebSocket", "unknown"));
        return;
      }
      socket.binaryType = "arraybuffer";

      const s = { socket, ready: false, info: null };
      session = s;

      let settled = false;
      const settle = (fn, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn(value);
      };
      const timer = setTimeout(() => {
        settle(reject, new LiveAdapterError("Server không phản hồi (không nhận được 'ready')", "timeout"));
        abandon(s);
      }, READY_TIMEOUT_MS);

      socket.onerror = () => {
        settle(
          reject,
          new LiveAdapterError(
            `Không kết nối được ${url} (server chưa chạy, hoặc Origin của trang này không được phép)`,
            "network",
          ),
        );
      };

      socket.onmessage = (ev) => {
        if (session !== s || typeof ev.data !== "string") return;
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (!msg || !msg.type) return;

        if (msg.type === "ready") {
          s.ready = true;
          s.info = msg;
          settle(resolve);
        } else if (msg.type === "error" && !s.ready) {
          // Ví dụ model chưa nạp được: server báo lỗi rồi đóng, không bao giờ gửi "ready".
          settle(reject, new LiveAdapterError(msg.message || "Server báo lỗi", "server"));
          abandon(s);
          return;
        } else if (msg.type === "flushed") {
          resolveFlushWaiters(true);
        }
        emit(msg.type, msg);
      };

      socket.onclose = (e) => {
        const wasCurrent = session === s;
        if (wasCurrent) session = null;
        resolveFlushWaiters(false);
        settle(reject, new LiveAdapterError(`Server đóng kết nối (mã ${e.code})`, "closed"));
        // Chỉ báo "close" khi server tự đóng một phiên đang chạy, không báo khi mình chủ động ngắt.
        if (wasCurrent && s.ready) emit("close", { code: e.code, reason: e.reason });
      };
    });

  /**
   * Backend hiện tại cố định ngôn ngữ theo biến môi trường WHISPER_LANGUAGE và chưa nhận lệnh đổi
   * ngôn ngữ theo từng kết nối, nên hàm này chưa làm gì. Ngôn ngữ thực tế nằm ở sự kiện "ready".
   */
  const setLanguage = () => {};

  const sendAudio = (chunk) => {
    const data = toPcm16(chunk);
    if (!data) return;
    const s = session;
    if (s?.ready && s.socket.readyState === WebSocket.OPEN) {
      try {
        s.socket.send(data);
      } catch (err) {
        console.warn("[LiveAdapter] failed to send audio", err);
      }
    }
  };

  /** Yêu cầu server chốt câu còn dang dở (chữ tạm) và chờ xác nhận, tối đa FLUSH_TIMEOUT_MS. */
  const flush = () =>
    new Promise((resolve) => {
      const s = session;
      if (!s || !s.ready || !s.info?.flush || s.socket.readyState !== WebSocket.OPEN) {
        resolve(false);
        return;
      }
      const finish = (ok) => {
        clearTimeout(timer);
        flushWaiters = flushWaiters.filter((w) => w !== finish);
        resolve(ok);
      };
      const timer = setTimeout(() => finish(false), FLUSH_TIMEOUT_MS);
      flushWaiters.push(finish);
      try {
        s.socket.send(JSON.stringify({ type: "flush" }));
      } catch {
        finish(false);
      }
    });

  return {
    connect,
    setLanguage,
    sendAudio,
    flush,
    disconnect,
    on,
    get connected() {
      return !!session?.ready && session.socket.readyState === WebSocket.OPEN;
    },
    get serverInfo() {
      return session?.info ?? null;
    },
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