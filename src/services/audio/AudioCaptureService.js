/**
 * AudioCaptureService
 * Thu âm thanh từ micro hoặc từ tab/màn hình.
 * Mỗi khối trả về là một ArrayBuffer PCM16 little-endian, mono, 16 kHz (~100 ms / khối),
 * đúng định dạng backend nhận, nên gửi thẳng qua WebSocket không cần đổi gì thêm.
 */

import workletUrl from "@/services/audio/pcmprocessor?url";

// Phải trùng với registerProcessor("pcm", ...) trong pcmprocessor.js (phân biệt hoa/thường).
const WORKLET_NAME = "pcm";

export class AudioCaptureService {
  /**
   * @param {{ source?: "display" | "mic", sampleRate?: number }} options
   */
  constructor({ source = "display", sampleRate = 16000 } = {}) {
    this.source = source;
    this.sampleRate = sampleRate;
    this.stream = null;
    this.audioCtx = null;
    this.node = null;
    this.srcNode = null;
    this.mute = null;
    this.running = false;
  }

  /**
   * @param {(chunk: ArrayBuffer) => void} onChunk  nhận mỗi khối PCM16
   * @param {() => void} [onEnded]  gọi khi người dùng dừng chia sẻ
   */
  async start(onChunk, onEnded) {
    if (this.running) return;

    try {
      this.stream = await this.#getStream();

      this.audioCtx = this.#createContext();
      await this.audioCtx.audioWorklet.addModule(workletUrl);

      try {
        this.srcNode = this.audioCtx.createMediaStreamSource(this.stream);
      } catch {
        // Một số trình duyệt không cho nối luồng khác tần số với context 16 kHz:
        // dùng context mặc định, worklet sẽ tự hạ về 16 kHz.
        await this.audioCtx.close();
        this.audioCtx = new AudioContext();
        await this.audioCtx.audioWorklet.addModule(workletUrl);
        this.srcNode = this.audioCtx.createMediaStreamSource(this.stream);
      }

      this.node = new AudioWorkletNode(this.audioCtx, WORKLET_NAME, {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: { targetRate: this.sampleRate },
      });
      this.node.port.onmessage = (e) => onChunk(e.data);

      // Nối tới đích với âm lượng 0: trình duyệt chắc chắn chạy worklet mà không phát tiếng ra loa.
      this.mute = this.audioCtx.createGain();
      this.mute.gain.value = 0;
      this.srcNode.connect(this.node);
      this.node.connect(this.mute);
      this.mute.connect(this.audioCtx.destination);

      this.stream.getAudioTracks()[0].addEventListener("ended", () => {
        if (!this.running) return;
        this.stop();
        onEnded?.();
      });

      this.running = true;
    } catch (err) {
      this.stop(); // không để lại micro / context mở khi khởi động lỗi
      throw err;
    }
  }

  stop() {
    for (const n of [this.node, this.srcNode, this.mute]) {
      try {
        n?.disconnect();
      } catch {}
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      this.audioCtx.close().catch(() => {});
    }
    this.node = this.srcNode = this.mute = this.stream = this.audioCtx = null;
    this.running = false;
  }

  #createContext() {
    try {
      return new AudioContext({ sampleRate: this.sampleRate });
    } catch {
      return new AudioContext(); // không ép được 16 kHz: worklet sẽ tự hạ tần số
    }
  }

  async #getStream() {
    if (this.source === "mic") {
      return navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true, // bắt buộc ở hầu hết trình duyệt
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    if (stream.getAudioTracks().length === 0) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error(
        "Không có âm thanh. Hãy chọn tab/màn hình và tick 'Chia sẻ âm thanh'.",
      );
    }
    stream.getVideoTracks().forEach((t) => t.stop());
    return stream;
  }
}