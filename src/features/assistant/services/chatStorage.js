import { isChromeExtension } from "@/config/env";

const STORAGE_KEY = "assistant-chats";

/**
 * Chat tạm (temporary) không bao giờ được ghi xuống storage — giống Leo:
 * đóng là mất. Chỉ chat thường nằm trong `conversations`.
 *
 * Shape: {
 *   conversations: [{ id, title, createdAt, updatedAt, messages: [...] }],
 *   activeId: string | null,
 * }
 *
 * Message: { id, role: "user" | "assistant", content, error?: code }
 */

const MAX_CONVERSATIONS = 30;
const MAX_MESSAGES = 200;

function shapeMessage(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.role !== "user" && raw.role !== "assistant") return null;
  if (typeof raw.content !== "string") return null;

  return {
    id: typeof raw.id === "string" ? raw.id : newId("msg"),
    role: raw.role,
    content: raw.content,
    error: typeof raw.error === "string" ? raw.error : undefined,
  };
}

function shapeConversation(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.id !== "string") return null;

  const messages = Array.isArray(raw.messages)
    ? raw.messages.map(shapeMessage).filter(Boolean).slice(-MAX_MESSAGES)
    : [];

  return {
    id: raw.id,
    title: typeof raw.title === "string" && raw.title ? raw.title : "New chat",
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
    updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : Date.now(),
    messages,
  };
}

function shape(raw) {
  const conversations = Array.isArray(raw?.conversations)
    ? raw.conversations.map(shapeConversation).filter(Boolean).slice(0, MAX_CONVERSATIONS)
    : [];

  const activeId = conversations.some((c) => c.id === raw?.activeId)
    ? raw.activeId
    : (conversations[0]?.id ?? null);

  return { conversations, activeId };
}

/** Id đủ ngắn để đọc, đủ ngẫu nhiên để không đụng nhau. */
export function newId(prefix = "chat") {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Tiêu đề suy ra từ câu hỏi đầu tiên, giống Leo. */
export function deriveTitle(text) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return "New chat";
  return clean.length > 48 ? `${clean.slice(0, 48).trimEnd()}…` : clean;
}

export const chatStorage = {
  async get() {
    if (isChromeExtension()) {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      return shape(result[STORAGE_KEY]);
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return shape(raw ? JSON.parse(raw) : null);
    } catch {
      return { conversations: [], activeId: null };
    }
  },

  async set(data) {
    const conversations = Array.isArray(data?.conversations) ? data.conversations : [];

    // Lịch sử có thể phình to; chỉ lưu phần cần thiết và cắt bớt
    const trimmed = {
      activeId: data?.activeId ?? null,
      conversations: conversations.slice(0, MAX_CONVERSATIONS).map((c) => ({
        ...c,
        messages: Array.isArray(c?.messages) ? c.messages.slice(-MAX_MESSAGES) : [],
      })),
    };

    if (isChromeExtension()) {
      await chrome.storage.local.set({ [STORAGE_KEY]: trimmed });
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  },

  /** Chat mới, chưa có tin nhắn. */
  createConversation() {
    const now = Date.now();
    return {
      id: newId(),
      title: "New chat",
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
  },

  /** Thêm tin nhắn vào cuối và cập nhật `updatedAt`; đặt tiêu đề nếu là câu hỏi đầu. */
  appendMessage(data, conversationId, message) {
    const conversations = data.conversations.map((c) => {
      if (c.id !== conversationId) return c;

      const isFirstUser =
        message.role === "user" && !c.messages.some((m) => m.role === "user");

      return {
        ...c,
        title: isFirstUser && c.title === "New chat" ? deriveTitle(message.content) : c.title,
        updatedAt: Date.now(),
        messages: [...c.messages, message].slice(-MAX_MESSAGES),
      };
    });

    return { ...data, conversations };
  },

  /** Ghi đè nội dung một tin nhắn (dùng khi streaming chữ về dần). */
  updateMessage(data, conversationId, messageId, patch) {
    const conversations = Array.isArray(data?.conversations)
      ? data.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: Array.isArray(c.messages)
                  ? c.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m))
                  : [],
              }
            : c,
        )
      : [];

    return { ...(data || {}), conversations, activeId: data?.activeId ?? null };
  },

  /** Bỏ tin nhắn cuối nếu nó rỗng — tránh lưu lại bong bóng trống khi Stop sớm. */
  dropEmptyTail(data, conversationId) {
    const conversations = data.conversations.map((c) => {
      if (c.id !== conversationId) return c;

      const messages = [...c.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === "assistant" && last.content.trim() === "") {
        messages.pop();
      }

      return { ...c, messages };
    });

    return { ...data, conversations };
  },

  renameConversation(data, conversationId, title) {
    const clean = String(title ?? "").trim();
    if (!clean) return data;

    return {
      ...data,
      conversations: data.conversations.map((c) =>
        c.id === conversationId ? { ...c, title: clean } : c,
      ),
    };
  },

  removeConversation(data, conversationId) {
    const conversations = data.conversations.filter((c) => c.id !== conversationId);

    return {
      conversations,
      activeId:
        data.activeId === conversationId ? (conversations[0]?.id ?? null) : data.activeId,
    };
  },

  clearAll() {
    return { conversations: [], activeId: null };
  },
};
