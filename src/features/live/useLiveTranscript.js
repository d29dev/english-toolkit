import { useCallback, useEffect, useRef, useState } from "react";
import { TranscriptionService } from "./LiveTranscriptService";
import { AudioCaptureService } from "@/services/audio/AudioCaptureService";
import { WS_URL } from "@/config/env";

export function useLiveTranscript() {
  const [running, setRunning] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("Chưa kết nối");
  const [language, setLanguage] = useState("vi");
  const [source, setSource] = useState("display");

  const transcriptRef = useRef(null);
  const captureRef = useRef(null);

  const stop = useCallback(() => {
    captureRef.current?.stop();
    captureRef.current = null;
    transcriptRef.current?.disconnect();
    setRunning(false);
  }, []);

  // Tạo service một lần, gắn listener một lần
  useEffect(() => {
    const transcript = new TranscriptionService(WS_URL);
    transcriptRef.current = transcript;

    const offs = [
      transcript.on("status", (m) => setStatus(`${m.message} (${m.language})`)),
      transcript.on("transcript", (m) => {
        if (m.text) setText((prev) => prev + m.text + " ");
      }),
      transcript.on("error", (m) => setStatus("Lỗi: " + m.message)),
      transcript.on("close", () => {
        setStatus("Đã ngắt kết nối");
        stop();
      }),
    ];

    // Dọn dẹp khi component bị gỡ
    return () => {
      offs.forEach((off) => off());
      captureRef.current?.stop();
      transcript.disconnect();
    };
  }, [stop]);

  // Đổi ngôn ngữ khi đang chạy
  useEffect(() => {
    transcriptRef.current?.setLanguage(language);
  }, [language]);

  const start = useCallback(async () => {
    const transcript = transcriptRef.current;
    try {
      await transcript.connect(language);

      const capture = new AudioCaptureService({ source });
      captureRef.current = capture;

      await capture.start(
        (chunk) => transcript.sendAudio(chunk),
        () => {
          stop();
          setStatus("Đã dừng chia sẻ");
        },
      );

      setRunning(true);
      setStatus("Đang ghi âm...");
    } catch (err) {
      console.error(err);
      setStatus("Lỗi: " + err.message);
      stop();
    }
  }, [language, source, stop]);

  const clear = useCallback(() => setText(""), []);

  return {
    running,
    text,
    status,
    language,
    setLanguage,
    source,
    setSource,
    start,
    stop,
    clear,
  };
}
