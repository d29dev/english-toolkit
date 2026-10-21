import { useState } from "react";

import { renderMarkdown } from "../services/markdown";

const ERROR_TEXT = {
  auth: "The provider rejected the credentials.",
  rate_limit: "Rate limit reached. Try again shortly.",
  network: "Could not reach the provider.",
  unavailable: "The provider is temporarily unavailable.",
  invalid: "The request was rejected.",
  unknown: "Something went wrong.",
};

/** Một bong bóng tin nhắn. Câu trả lời của assistant được render markdown. */
export default function Message({ message, streaming }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  async function copy() {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  if (isUser) {
    return (
      <div className="msg msg-user">
        <div className="msg-body">{message.content}</div>
      </div>
    );
  }

  return (
    <div className="msg msg-assistant">
      <div className="msg-avatar" aria-hidden="true">
        AI
      </div>

      <div className="msg-main">
        {message.error ? (
          <div className="msg-error">
            <strong>Error</strong>
            <span>{ERROR_TEXT[message.error] ?? ERROR_TEXT.unknown}</span>
            {message.content && <p className="msg-partial">{message.content}</p>}
          </div>
        ) : message.content ? (
          <div
            className="markdown"
            // renderMarkdown escape toàn bộ text trước khi thêm thẻ, nên an toàn
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        ) : (
          <span className="typing" aria-label="Assistant is typing">
            <i />
            <i />
            <i />
          </span>
        )}

        {!streaming && message.content && (
          <div className="msg-actions">
            <button type="button" className="btn-text" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
