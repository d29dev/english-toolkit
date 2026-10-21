import { useEffect, useRef, useState } from "react";

import ChatList from "./components/ChatList";
import Message from "./components/Message";
import { useAssistant } from "./useAssistant";
import { getChatAdapter } from "./services/chatService";

const SUGGESTIONS = [
  "Explain the difference between “affect” and “effect”.",
  "Rewrite this sentence more formally.",
  "Give me 5 idioms about time, with examples.",
];

export default function AssistantPanel() {
  const {
    active,
    temporary,
    loaded,
    draft,
    setDraft,
    streaming,
    error,
    clearError,
    newChat,
    clearAllChats,
    send,
    stop,
    retry,
  } = useAssistant();

  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef(null);

  const messages = active?.messages ?? [];
  const adapter = getChatAdapter();
  const lastContent = messages[messages.length - 1]?.content;

  // Bám đáy khi có tin nhắn mới hoặc chữ đang chạy về
  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length, lastContent, streaming]);

  function onSubmit(e) {
    e.preventDefault();
    send();
  }

  function onKeyDown(e) {
    // Enter gửi, Shift+Enter xuống dòng — giống Leo
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="chat">
      <div className="chat-toolbar">
        <span className="chat-model" title={`Adapter: ${adapter.name}`}>
          {adapter.model ?? adapter.name}
        </span>

        {temporary && <span className="chip chat-temp">Temporary</span>}

        <div className="chat-toolbar-actions">
          <button
            type="button"
            className="btn-text"
            onClick={() => setShowHistory((v) => !v)}
            aria-expanded={showHistory}
          >
            {showHistory ? "Hide chats" : "Chats"}
          </button>
          <button type="button" className="btn-text" onClick={() => newChat()}>
            New
          </button>
          <button
            type="button"
            className="btn-text"
            onClick={() => newChat({ asTemporary: true })}
            title="Chat without saving to history"
          >
            Temporary
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="chat-history">
          {temporary && (
            <p className="hint hint-info">
              You are in a temporary chat — it will not appear in this list.
            </p>
          )}
          <ChatList />
          {!temporary && (
            <button type="button" className="btn-text" onClick={clearAllChats}>
              Clear all chats
            </button>
          )}
        </div>
      )}

      <div className="chat-scroll">
        {!loaded ? (
          <p className="hint">Loading chats…</p>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            <h3>How can I help?</h3>
            <p className="hint">
              {temporary
                ? "This chat is temporary — closing it erases everything."
                : "Ask anything. Chats are saved on this device."}
            </p>
            <div className="chat-suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  type="button"
                  className="suggestion"
                  key={suggestion}
                  onClick={() => send(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <Message
              key={message.id}
              message={message}
              streaming={streaming && index === messages.length - 1}
            />
          ))
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="chat-error">
          <span>{error.message}</span>
          <div className="chat-error-actions">
            <button type="button" className="btn-text" onClick={retry}>
              Retry
            </button>
            <button type="button" className="btn-text" onClick={clearError}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <form className="chat-composer" onSubmit={onSubmit}>
        <textarea
          value={draft}
          rows={1}
          placeholder="Ask anything…"
          aria-label="Message"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
        />

        {streaming ? (
          <button type="button" className="btn-icon chat-stop" onClick={stop} title="Stop">
            ■
          </button>
        ) : (
          <button type="submit" className="chat-send" disabled={!draft.trim()}>
            Send
          </button>
        )}
      </form>

      <p className="hint chat-foot">
        Enter to send · Shift+Enter for a new line
      </p>
    </div>
  );
}
