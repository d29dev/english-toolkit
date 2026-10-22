import { getLiveAdapter } from "./services/liveAdapter";

/**
 * TranscriptionService
 * Giao tiếp với adapter live (mặc định là WebSocket Whisper, xem liveAdapter.js)
 *
 * Sự kiện (dùng .on(name, fn), trả về hàm huỷ đăng ký):
 *   "ready"       -> { sample_rate, language, device, flush, ... }   server đã sẵn sàng
 *   "transcript"  -> { text, stable, partial, latest, final, audio_seconds, rtf, inference_elapsed_ms, device }
 *                    stable  = chữ đã chốt (tích luỹ trong suốt phiên, không đổi nữa)
 *                    partial = chữ tạm của đoạn đang nói (mỗi lần là bản mới thay thế bản cũ)
 *                    text    = stable + partial (TOÀN BỘ phiên, không phải phần mới thêm)
 *   "flushed"     -> {}                                               server đã chốt xong câu cuối
 *   "error"       -> { message }
 *   "close"       -> { code, reason }                                  server tự đóng kết nối
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
    return !!this.adapter.connected;
  }

  /** Mở kết nối và chờ server báo "ready". */
  async connect(language = "vi") {
    if (typeof this.adapter.connect === "function") {
      await this.adapter.connect(language);
      return;
    }
    throw new Error("Live adapter không hỗ trợ connect()");
  }

  /** Backend hiện chưa hỗ trợ đổi ngôn ngữ theo kết nối (xem liveAdapter.setLanguage). */
  setLanguage(language) {
    if (typeof this.adapter.setLanguage === "function") {
      this.adapter.setLanguage(language);
    }
  }

  /** Gửi PCM16 mono 16 kHz (ArrayBuffer từ AudioCaptureService; Int16Array/Float32Array cũng được). */
  sendAudio(chunk) {
    if (typeof this.adapter.sendAudio === "function") {
      this.adapter.sendAudio(chunk);
    }
  }

  /** Chốt câu cuối trước khi ngắt kết nối. Resolve true nếu server đã xác nhận. */
  async flush() {
    if (typeof this.adapter.flush === "function") {
      return this.adapter.flush();
    }
    return false;
  }

  /** Chỉ đóng kết nối; các listener đăng ký bằng on() vẫn còn để dùng cho lần connect sau. */
  disconnect() {
    if (typeof this.adapter.disconnect === "function") {
      this.adapter.disconnect();
    }
  }

  /** Gỡ toàn bộ listener rồi đóng kết nối. Chỉ gọi khi huỷ hẳn service (ví dụ component bị gỡ). */
  dispose() {
    this.offFns.forEach((off) => {
      try {
        off();
      } catch {}
    });
    this.offFns = [];
    this.disconnect();
  }
}