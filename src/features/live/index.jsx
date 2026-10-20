import { useEffect, useRef } from "react";
import { useLiveTranscript } from "./useLiveTranscript";

export default function LivePanel() {
  const {
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
  } = useLiveTranscript();

  const textareaRef = useRef(null);

  // Tự cuộn textarea xuống cuối khi có chữ mới
  useEffect(() => {
    const el = textareaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [text]);

  return (
    <>
      <div className="controller">
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="vi">Tiếng Việt</option>
          <option value="en">English</option>
        </select>

        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          disabled={running}
        >
          <option value="display">Tab / hệ thống</option>
          <option value="mic">Micro</option>
        </select>

        <div className="action">
          <button onClick={running ? stop : start}>
            {running ? "Stop" : "Start"}
          </button>
          <button onClick={clear}>Clear</button>
        </div>

        <span
          className={
            status.startsWith("Lỗi")
              ? "status status-err"
              : running
                ? "status status-ok"
                : "status"
          }
        >
          {status}
        </span>
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        readOnly
        rows={12}
        className="transcript"
      />
    </>
  );
}
