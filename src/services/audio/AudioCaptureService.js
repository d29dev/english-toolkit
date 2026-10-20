/**
 * AudioCaptureService
 * Thu âm thanh từ micro hoặc từ tab/màn hình, trả về PCM Float32 mono 16 kHz.
 */

import workletUrl from "@/services/audio/pcmprocessor?url"
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
    this.running = false;
  }

  /**
   * @param {(chunk: Float32Array) => void} onChunk  nhận mỗi khối PCM
   * @param {() => void} [onEnded]  gọi khi người dùng dừng chia sẻ
   */
  async start(onChunk, onEnded) {
    if (this.running) return;

    this.stream = await this.#getStream();

    this.audioCtx = new AudioContext({ sampleRate: this.sampleRate });
    await this.audioCtx.audioWorklet.addModule(workletUrl);

    this.srcNode = this.audioCtx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.audioCtx, "pcm-processor");
    this.node.port.onmessage = (e) => onChunk(e.data);
    this.srcNode.connect(this.node);

    this.stream.getAudioTracks()[0].addEventListener("ended", () => {
      this.stop();
      onEnded?.();
    });

    this.running = true;
  }

  stop() {
    this.node?.disconnect();
    this.srcNode?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.audioCtx && this.audioCtx.state !== "closed") this.audioCtx.close();
    this.node = this.srcNode = this.stream = this.audioCtx = null;
    this.running = false;
  }

  async #getStream() {
    if (this.source === "mic") {
      return navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true, // bắt buộc ở hầu hết trình duyệt
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });

    if (stream.getAudioTracks().length === 0) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error("Không có âm thanh. Hãy chọn tab/màn hình và tick 'Chia sẻ âm thanh'.");
    }
    stream.getVideoTracks().forEach((t) => t.stop());
    return stream;
  }
}