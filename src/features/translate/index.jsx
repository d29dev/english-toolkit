import { useState } from "react";

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

export default function TranslatePanel() {
  const [from, setFrom] = useState("auto");
  const [to, setTo] = useState("en");
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [notice, setNotice] = useState("");

  const languageOptions = (withAuto) =>
    LANGUAGES.filter((l) => withAuto || l.code !== "auto").map((l) => (
      <option key={l.code} value={l.code}>
        {l.label}
      </option>
    ));

  function swap() {
    // "Detect language" không thể làm target — chỉ đảo khi cả hai đều cụ thể
    if (from !== "auto") {
      setFrom(to);
      setTo(from);
    }
    setText(result);
    setResult(text);
    setNotice("");
  }

  function translate() {
    setNotice("Translation backend is not connected yet.");
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
    setText("");
    setResult("");
    setNotice("");
  }

  return (
    <>
      <div className="toolbar">
        <label className="field-inline">
          From
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
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
          <select value={to} onChange={(e) => setTo(e.target.value)}>
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
            <button type="button" className="btn-text" onClick={clear}>
              Clear
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste text to translate…"
            maxLength={MAX}
          />
        </div>

        <div className="box">
          <div className="box-head">
            <span>Translation</span>
            <button type="button" className="btn-text" onClick={copy}>
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
        <button type="button" onClick={translate} disabled={!text.trim()}>
          Translate
        </button>
        {notice && <span className="hint hint-info">{notice}</span>}
      </div>
    </>
  );
}
