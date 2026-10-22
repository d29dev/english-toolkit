
import { useEffect, useMemo, useState } from "react";
import debounce from "@/core/utils/debounce";
import { createAbortController } from "@/utils/abortController";

const LANGUAGES = [
  { code: "auto", label: "Detect language" },
  { code: "en", label: "English" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
];

const MAX = 5000;
const DEBOUNCE_DELAY = 300;

export default function TranslatePanel() {
  const [from, setFrom] = useState("auto");
  const [to, setTo] = useState("en");
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [notice, setNotice] = useState("");

  // Dùng chung một controller manager cho component.
  const requestController = useMemo(
    () => createAbortController(),
    [],
  );

  
const debouncedTranslate = useMemo(
  () =>
    debounce(async (query, sourceLang, targetLang) => {
      const controller = requestController.create();

      try {
        const params = new URLSearchParams({
          client: "gtx",
          sl: sourceLang,
          tl: targetLang,
          dt: "t",
          q: query,
        });

        const response = await fetch(
          `https://translate.googleapis.com/translate_a/single?${params}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // API trả về các đoạn dịch trong data[0].
        const translation = data[0]
          .map((segment) => segment[0])
          .filter(Boolean)
          .join("");

        if (!translation) {
          throw new Error("Empty translation response");
        }

        setResult(translation);
        setNotice("");
      } catch (error) {
        if (error.name === "AbortError") return;

        setNotice(`Translation failed: ${error.message}`);
      }
    }, DEBOUNCE_DELAY),
  [requestController],
);


  useEffect(() => {
    const query = text.trim();

    if (!query) {
      debouncedTranslate.cancel();
      requestController.abort();
      setResult("");
      setNotice("");
      return;
    }

    debouncedTranslate(query, from, to);

    // Hủy request cũ khi text hoặc ngôn ngữ thay đổi.
    // Không cancel debounce tại đây vì effect chạy mỗi lần
    // input thay đổi; lần gọi mới sẽ reset timer.
    return () => {
      requestController.abort();
    };
  }, [text, from, to, debouncedTranslate, requestController]);

  useEffect(() => {
    // Cleanup khi component unmount.
    return () => {
      debouncedTranslate.cancel();
      requestController.abort();
    };
  }, [debouncedTranslate, requestController]);

  function languageOptions(withAuto) {
    return LANGUAGES
      .filter((language) => withAuto || language.code !== "auto")
      .map((language) => (
        <option key={language.code} value={language.code}>
          {language.label}
        </option>
      ));
  }

  function swap() {
    if (from !== "auto") {
      setFrom(to);
      setTo(from);
    }

    setText(result);
    setResult(text);
    setNotice("");
  }

  async function copy() {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result);
      setNotice("Copied to clipboard.");
    } catch {
      setNotice("Could not access the clipboard.");
    }
  }

  function clear() {
    debouncedTranslate.cancel();
    requestController.abort();
    setText("");
    setResult("");
    setNotice("");
  }

  return (
    <>
      <div className="toolbar">
        <label className="field-inline">
          From
          <select
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          >
            {languageOptions(true)}
          </select>
        </label>

        <button
          type="button"
          className="btn-icon"
          onClick={swap}
          title="Swap languages"
          aria-label="Swap languages"
        >
          ⇄
        </button>

        <label className="field-inline">
          To
          <select
            value={to}
            onChange={(event) => setTo(event.target.value)}
          >
            {languageOptions(false)}
          </select>
        </label>

        <span className="char-count">
          {text.length} / {MAX}
        </span>
      </div>

      <div className="split">
        <div className="box">
          <div className="box-head">
            <span>Source</span>
            <button
              type="button"
              className="btn-text"
              onClick={clear}
            >
              Clear
            </button>
          </div>

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Type or paste text to translate…"
            maxLength={MAX}
          />
        </div>

        <div className="box">
          <div className="box-head">
            <span>Translation</span>
            <button
              type="button"
              className="btn-text"
              onClick={copy}
            >
              Copy
            </button>
          </div>

          <textarea
            value={result}
            readOnly
            placeholder="The translation appears here."
          />
        </div>
      </div>

      <div className="actions">
        {notice && (
          <span className="hint hint-info" role="status">
            {notice}
          </span>
        )}
      </div>
    </>
  );
}
