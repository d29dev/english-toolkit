import { useState } from "react";

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "academic", label: "Academic" },
  { value: "simple", label: "Simple & clear" },
  { value: "shorter", label: "Make it shorter" },
  { value: "expand", label: "Make it longer" },
];

const MAX = 8000;

export default function RewritePanel() {
  const [text, setText] = useState("");
  const [tone, setTone] = useState("professional");
  const [result, setResult] = useState("");
  const [notice, setNotice] = useState("");

  function rewrite() {
    setNotice("Rewrite backend is not connected yet.");
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
          Style
          <select value={tone} onChange={(e) => setTone(e.target.value)}>
            {TONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <span className="char-count">
          {text.length} / {MAX}
        </span>
      </div>

      <div className="split">
        <div className="box">
          <div className="box-head">
            <span>Original</span>
            <button type="button" className="btn-text" onClick={clear}>
              Clear
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the text you want to rewrite…"
            maxLength={MAX}
          />
        </div>

        <div className="box">
          <div className="box-head">
            <span>Rewritten</span>
            <button type="button" className="btn-text" onClick={copy}>
              Copy
            </button>
          </div>
          <textarea
            value={result}
            readOnly
            placeholder="The rewritten text appears here."
          />
        </div>
      </div>

      <div className="actions">
        <button type="button" onClick={rewrite} disabled={!text.trim()}>
          Rewrite
        </button>
        {notice && <span className="hint hint-info">{notice}</span>}
      </div>
    </>
  );
}
