import { getLiveAdapter } from "./services/liveAdapter";

/**
 * TranscriptionService
 * Giao tiếp với adapter live (mặc định là WebSocket Whisper)
 *
 * Sự kiện (dùng .on(name, fn)):
 *   "status"      -> { message, language }
 *   "transcript"  -> { text }
 *   "error"       -> { message }
 *   "close"       -> { code, reason }
 */
export class TranscriptionService {
  constructor(adapter) {
    this.adapter = adapter || getLiveAdapter();
    this.offFns = [];
  }

  on(event, fn) {
    const off = this.adapter.on?.(event, fn);
    if (typeof off === "function") {
      this.offFns.push(off);
      return off;
    }
    return () => {};
  }

  get connected() {
    // Adapter không nhất thiết expose connected; kiểm tra an toàn
    if (typeof this.adapter.connected === "boolean") return this.adapter.connected;
    // Với WebSocket adapter, trạng thái phụ thuộc vào kết nối nội bộ
    return false;
  }

  async connect(language = "vi") {
    if (typeof this.adapter.connect === "function") {
      await this.adapter.connect(language);
      return;
    }
    throw new Error("Live adapter không hỗ trợ connect()");
  }

  /** Đổi ngôn ngữ ("en" hoặc "vi") */
  setLanguage(language) {
    if (typeof this.adapter.setLanguage === "function") {
      this.adapter.setLanguage(language);
    }
  }

  /** Gửi PCM Float32 mono 16 kHz */
  sendAudio(float32) {
    if (typeof this.adapter.sendAudio === "function") {
      this.adapter.sendAudio(float32);
    }
  }

  disconnect() {
    this.offFns.forEach((off) => {
      try {
        off();
      } catch {}
    });
    this.offFns = [];
    if (typeof this.adapter.disconnect === "function") {
      this.adapter.disconnect();
    }
  }
}
