import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TranscriptionService } from "./LiveTranscriptService";
import { AudioCaptureService } from "@/services/audio/AudioCaptureService";

const EMPTY = { stable: "", partial: "", info: null };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function friendlyError(err) {
  if (err?.name === "NotAllowedError") return "Chưa được cấp quyền micro / chia sẻ màn hình";
  if (err?.name === "NotFoundError") return "Không tìm thấy thiết bị thu âm";
  return err?.message || String(err);
}

/**
 * Hook phiên âm realtime.
 *
 * Backend gửi mỗi lần TOÀN BỘ chữ của phiên: `stable` (đã chốt) + `partial` (chữ tạm, bị thay thế
 * ở lần sau). Vì vậy hook KHÔNG cộng dồn các message mà chỉ lưu bản mới nhất.
 *
 * Trả về:
 *   text     stable + partial (đã trừ phần người dùng "Xóa")
 *   stable   chữ đã chốt đang hiển thị
 *   partial  chữ tạm đang hiển thị
 *   info     { final, audioSeconds, elapsedMs, rtf, device } của lượt suy luận gần nhất
 *   server   { language, device } do server báo khi kết nối (ngôn ngữ do backend quyết định)
 */
export function useLiveTranscript() {
  const [running, setRunning] = useState(false);
  const [live, setLive] = useState(EMPTY);
  const [clearOffset, setClearOffset] = useState(0);
  const [status, setStatus] = useState("Chưa kết nối");
  const [language, setLanguage] = useState("vi");
  const [source, setSource] = useState("display");
  const [server, setServer] = useState(null);

  const transcriptRef = useRef(null);
  const captureRef = useRef(null);
  const stableRef = useRef("");
  const serverRef = useRef(null);
  const activeRef = useRef(false); // true từ lúc bấm start tới lúc stop bắt đầu (stop chỉ chạy một lần)

  /**
   * Dừng phiên: ngừng thu, (tuỳ chọn) xin server chốt câu cuối, rồi đóng kết nối.
   * Chỉ đóng kết nối, KHÔNG gỡ listener, nên start lại được.
   */
  const stop = useCallback(async ({ flush = true, status: finalStatus = "Đã dừng" } = {}) => {
    if (!activeRef.current) return;
    activeRef.current = false;

    captureRef.current?.stop();
    captureRef.current = null;

    const transcript = transcriptRef.current;
    if (flush && transcript) {
      setStatus("Đang chốt câu cuối…");
      await sleep(150); // để các khối âm thanh đang bay kịp tới server trước lệnh flush
      await transcript.flush();
    }
    transcript?.disconnect();
    setRunning(false);
    setStatus(finalStatus);
  }, []);

  // Tạo service một lần, gắn listener một lần
  useEffect(() => {
    const transcript = new TranscriptionService();
    transcriptRef.current = transcript;

    const offs = [
      transcript.on("ready", (m) => {
        const info = { language: m.language, device: m.device };
        serverRef.current = info;
        setServer(info);
      }),
      transcript.on("transcript", (m) => {
        const stable = m.stable || "";
        stableRef.current = stable;
        setLive({
          stable,
          partial: m.partial || "",
          info: {
            final: !!m.final,
            audioSeconds: m.audio_seconds,
            elapsedMs: m.inference_elapsed_ms,
            rtf: m.rtf,
            device: m.device,
          },
        });
      }),
      transcript.on("error", (m) => setStatus("Lỗi: " + m.message)),
      // Server tự đóng giữa chừng: không còn kết nối để flush.
      transcript.on("close", () => {
        stop({ flush: false, status: "Đã ngắt kết nối" });
      }),
    ];

    // Dọn dẹp khi component bị gỡ
    return () => {
      offs.forEach((off) => off());
      activeRef.current = false;
      captureRef.current?.stop();
      captureRef.current = null;
      transcript.dispose();
    };
  }, [stop]);

  // Backend hiện chưa đổi được ngôn ngữ theo kết nối; giữ lời gọi để dùng được khi backend hỗ trợ.
  useEffect(() => {
    transcriptRef.current?.setLanguage(language);
  }, [language]);

  const start = useCallback(async () => {
    if (activeRef.current) return;
    activeRef.current = true;

    const transcript = transcriptRef.current;
    stableRef.current = "";
    serverRef.current = null;
    setLive(EMPTY);
    setClearOffset(0);
    setServer(null);
    setStatus("Đang kết nối…");

    try {
      await transcript.connect(language); // resolve khi server báo "ready"
      if (!activeRef.current) return; // đã bị dừng trong lúc chờ kết nối

      const capture = new AudioCaptureService({ source });
      captureRef.current = capture;

      await capture.start(
        (chunk) => transcript.sendAudio(chunk),
        () => stop({ status: "Đã dừng chia sẻ" }),
      );

      if (!activeRef.current) {
        capture.stop();
        return;
      }

      const info = serverRef.current;
      setRunning(true);
      setStatus(info ? `Đang ghi âm · ${info.device} · ngôn ngữ ${info.language}` : "Đang ghi âm…");
    } catch (err) {
      console.error(err);
      await stop({ flush: false, status: "Lỗi: " + friendlyError(err) });
    }
  }, [language, source, stop]);

  // Dùng bản bọc để gắn thẳng vào onClick (không truyền event vào tham số của stop).
  const stopRecording = useCallback(() => stop(), [stop]);

  // Server giữ nguyên `stable` cả phiên, nên "Xóa" chỉ ẩn phần đã có tới thời điểm bấm.
  const clear = useCallback(() => {
    setClearOffset(stableRef.current.length);
    setLive((l) => ({ ...l, partial: "" }));
  }, []);

  const shownStable = useMemo(() => live.stable.slice(clearOffset).trim(), [live.stable, clearOffset]);
  const text = useMemo(
    () => [shownStable, live.partial].filter(Boolean).join(" "),
    [shownStable, live.partial],
  );

  return {
    running,
    text,
    stable: shownStable,
    partial: live.partial,
    info: live.info,
    status,
    server,
    language,
    setLanguage,
    source,
    setSource,
    start,
    stop: stopRecording,
    clear,
  };
}