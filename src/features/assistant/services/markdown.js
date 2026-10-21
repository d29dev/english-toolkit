/**
 * Markdown tối giản cho câu trả lời của assistant.
 *
 * An toàn là ưu tiên số 1: nội dung do model trả về là **không tin được**,
 * nên toàn bộ text được escape trước, rồi mới áp định dạng. Không bao giờ
 * render HTML thô từ model.
 *
 * Hỗ trợ: fenced code block, inline code, đậm, nghiêng, link http(s),
 * danh sách gạch đầu dòng/số, tiêu đề, đoạn văn, xuống dòng.
 */

const ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/** Chỉ cho phép http(s) — chặn javascript:, data:, vbscript:… */
function safeUrl(url) {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

/** Định dạng trong một dòng: code, link, đậm, nghiêng. */
function inline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
      const href = safeUrl(url);
      return href
        ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`
        : match;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/(^|[\s(])_([^_\n]+)_/g, "$1<em>$2</em>");
}

/**
 * Chuyển markdown -> HTML an toàn.
 * Trả về chuỗi HTML đã escape; render bằng `dangerouslySetInnerHTML`.
 */
export function renderMarkdown(source) {
  const lines = String(source ?? "").split("\n");
  const html = [];

  let inCode = false;
  let codeLines = [];
  let listType = null; // "ul" | "ol" | null
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    html.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  };

  const flushCode = () => {
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    codeLines = [];
    inCode = false;
  };

  for (const line of lines) {
    // --- trong code block ---
    if (inCode) {
      if (line.startsWith("```")) flushCode();
      else codeLines.push(line);
      continue;
    }

    // --- mở code block ---
    if (line.trimStart().startsWith("```")) {
      flushParagraph();
      closeList();
      inCode = true;
      continue;
    }

    // --- dòng trống: kết thúc đoạn/list ---
    if (line.trim() === "") {
      flushParagraph();
      closeList();
      continue;
    }

    // --- tiêu đề ---
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      closeList();
      const level = Math.min(heading[1].length + 2, 6); // # -> h3, ## -> h4…
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    // --- danh sách ---
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);

    if (bullet || numbered) {
      flushParagraph();
      const wanted = bullet ? "ul" : "ol";
      if (listType !== wanted) {
        closeList();
        listType = wanted;
        html.push(`<${wanted}>`);
      }
      html.push(`<li>${inline((bullet ?? numbered)[1])}</li>`);
      continue;
    }

    // --- trích dẫn ---
    const quote = /^\s*>\s?(.*)$/.exec(line);
    if (quote) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${inline(quote[1])}</blockquote>`);
      continue;
    }

    closeList();
    paragraph.push(line.trim());
  }

  if (inCode) flushCode(); // code block chưa đóng (đang stream) — vẫn render
  flushParagraph();
  closeList();

  return html.join("");
}
