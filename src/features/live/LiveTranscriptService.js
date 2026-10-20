/**
 * TranscriptionService
 * Giao tiếp với backend Whisper qua WebSocket.
 *
 * Sự kiện (dùng .on(name, fn)):
 *   "status"      -> { message, language }
 *   "transcript"  -> { text }
 *   "error"       -> { message }
 *   "close"       -> { code, reason }
 */
export class TranscriptionService {
  constructor(url = "ws://127.0.0.1:8765") {
    this.url = url;
    this.ws = null;
    this.handlers = {};
  }

  on(event, fn) {
    (this.handlers[event] ||= []).push(fn);
    return () =>
      (this.handlers[event] = this.handlers[event].filter((f) => f !== fn));
  }

  #emit(event, payload) {
    (this.handlers[event] || []).forEach((fn) => fn(payload));
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect(language = "en") {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        this.ws = ws;
        this.setLanguage(language);
        resolve();
      };
      ws.onerror = () => reject(new Error("Không kết nối được WebSocket"));
      ws.onclose = (e) => {
        this.ws = null;
        this.#emit("close", { code: e.code, reason: e.reason });
      };
      ws.onmessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (msg.type) this.#emit(msg.type, msg);
      };
    });
  }

  /** Đổi ngôn ngữ ("en" hoặc "vi") */
  setLanguage(language) {
    if (this.connected)
      this.ws.send(JSON.stringify({ type: "config", language }));
  }

  /** Gửi PCM Float32 mono 16 kHz */
  sendAudio(float32) {
    if (this.connected) this.ws.send(float32.buffer);
  }

  disconnect() {
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) this.ws.close();
    this.ws = null;
  }
}
