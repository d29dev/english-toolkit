import { useState } from "react";

import { useAssistant } from "../useAssistant";

/** Danh sách chat đã lưu: chọn, đổi tên, xoá. Ẩn đi khi đang chat tạm. */
export default function ChatList() {
  const {
    conversations,
    activeId,
    temporary,
    selectChat,
    renameChat,
    removeChat,
  } = useAssistant();

  const [editing, setEditing] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");

  if (conversations.length === 0) {
    return <p className="hint">No saved chats yet.</p>;
  }

  function startRename(conversation) {
    setEditing(conversation.id);
    setDraftTitle(conversation.title);
  }

  function commitRename(conversation) {
    renameChat(conversation.id, draftTitle);
    setEditing(null);
  }

  return (
    <ul className="chat-list">
      {conversations.map((conversation) => (
        <li
          className={`chat-list-item${
            !temporary && conversation.id === activeId ? " is-active" : ""
          }`}
          key={conversation.id}
        >
          {editing === conversation.id ? (
            <form
              className="chat-rename"
              onSubmit={(e) => {
                e.preventDefault();
                commitRename(conversation);
              }}
            >
              <input
                className="chat-rename-input"
                value={draftTitle}
                autoFocus
                aria-label="Chat title"
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={() => commitRename(conversation)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditing(null);
                }}
              />
            </form>
          ) : (
            <>
              <button
                type="button"
                className="chat-open"
                onClick={() => selectChat(conversation.id)}
                title={conversation.title}
              >
                {conversation.title}
              </button>

              <button
                type="button"
                className="btn-text chat-rename-btn"
                onClick={() => startRename(conversation)}
                aria-label={`Rename ${conversation.title}`}
              >
                Rename
              </button>

              <button
                type="button"
                className="btn-text chat-delete-btn"
                onClick={() => removeChat(conversation.id)}
                aria-label={`Delete ${conversation.title}`}
              >
                Delete
              </button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
