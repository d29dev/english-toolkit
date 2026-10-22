// AudioWorklet "pcm": nhận audio từ mic/tab, hạ về 16 kHz nếu AudioContext không chạy ở 16 kHz,
// đổi sang PCM16 little-endian và gửi từng gói 1600 mẫu (~100 ms) về luồng chính dưới dạng ArrayBuffer.
// Đây đúng là định dạng backend (WS /ws/transcribe) cần: PCM16 mono 16 kHz.
class Pcm extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this.targetRate = opts.targetRate || 16000;
    this.packetSize = opts.packetSamples || 1600;
    // `sampleRate` là biến toàn cục của AudioWorkletGlobalScope (tần số của AudioContext).
    this.ratio = sampleRate / this.targetRate;
    this.buf = new Int16Array(this.packetSize);
    this.n = 0;
    // Trạng thái bộ hạ tần số (nội suy tuyến tính, chạy liên tục qua các khối 128 mẫu).
    this.tail = new Float32Array(0);
    this.pos = 0;
  }

  push(v) {
    const x = v > 1 ? 1 : v < -1 ? -1 : v;
    this.buf[this.n++] = x < 0 ? x * 32768 : x * 32767;
    if (this.n === this.packetSize) {
      const out = this.buf.buffer;
      this.port.postMessage(out, [out]); // chuyển quyền sở hữu, không sao chép
      this.buf = new Int16Array(this.packetSize);
      this.n = 0;
    }
  }

  resample(block) {
    const c = new Float32Array(this.tail.length + block.length);
    c.set(this.tail, 0);
    c.set(block, this.tail.length);

    while (this.pos + 1 < c.length) {
      const i = Math.floor(this.pos);
      const f = this.pos - i;
      this.push(c[i] + (c[i + 1] - c[i]) * f);
      this.pos += this.ratio;
    }

    // Giữ lại phần đuôi cần cho khối sau, dời vị trí đọc tương ứng.
    const keepFrom = Math.min(Math.floor(this.pos), c.length);
    this.tail = c.slice(keepFrom);
    this.pos -= keepFrom;
  }

  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    if (this.ratio === 1) {
      for (let i = 0; i < ch.length; i++) this.push(ch[i]);
    } else {
      this.resample(ch);
    }
    return true;
  }
}
registerProcessor("pcm", Pcm);