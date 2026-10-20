// AudioWorklet: gom frame 128 mẫu thành khối 4096 mẫu rồi gửi về main thread
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = new Float32Array(4096);
    this.pos = 0;
  }
  process(inputs) {
    const ch = inputs[0][0];
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this.buf[this.pos++] = ch[i];
        if (this.pos === this.buf.length) {
          this.port.postMessage(this.buf.slice(0));
          this.pos = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor("pcm-processor", PCMProcessor);