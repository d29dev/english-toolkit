import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AssistantContext } from "./assistantContext";
import { ChatError, sendChat } from "./services/chatService";
import { chatStorage, newId } from "./services/chatStorage";

const EMPTY = { conversations: [], activeId: null };

export function AssistantProvider({ children }) {
  const [data, setData] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  /** Chat tạm: không nằm trong `data`, đóng là mất — giống Leo. */
  const [temporary, setTemporary] = useState(null);

  const abortRef = useRef(null);
  const persistTimer = useRef(null);
  /**
   * Bản sao `data` mới nhất.
   *
   * Callback trong `send()` sống lâu hơn một lần render, nên nếu đọc trực
   * tiếp biến `data` trong closure thì chúng thấy state cũ — mỗi delta
   * streaming sẽ ghi đè lên phiên bản trước đó và làm mất tin nhắn.
   */
  const dataRef = useRef(EMPTY);
  const temporaryRef = useRef(null);

  /** Chat đang mở, tính từ state. */
  const active = useMemo(() => {
    if (temporary) return temporary;
    return data.conversations.find((c) => c.id === data.activeId) ?? null;
  }, [temporary, data]);

  const activeRef = useRef(active);
  const draftRef = useRef(draft);
  const streamingRef = useRef(false);

  // Đồng bộ ref sau khi render, để callback trong `send()` luôn thấy giá trị mới
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    streamingRef.current = streaming;
  }, [streaming]);

  useEffect(() => {
    let active = true;

    chatStorage
      .get()
      .then((saved) => {
        if (!active) return;
        dataRef.current = saved;
        setData(saved);
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  // Huỷ request đang bay khi unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  /**
   * Ghi xuống storage, gộp nhiều lần gọi liên tiếp.
   * Streaming nhả chữ rất nhanh; ghi mỗi delta sẽ đập vào storage liên tục.
   */
  const persist = useCallback((next, { immediate = false } = {}) => {
    dataRef.current = next;
    setData(next);

    if (persistTimer.current) clearTimeout(persistTimer.current);

    if (immediate) {
      persistTimer.current = null;
      chatStorage.set(next).catch((err) => console.error("Cannot save chats:", err));
      return;
    }

    persistTimer.current = setTimeout(() => {
      persistTimer.current = null;
      chatStorage.set(dataRef.current).catch((err) =>
        console.error("Cannot save chats:", err),
      );
    }, 400);
  }, []);

  // Ghi nốt phần đang chờ khi unmount
  useEffect(
    () => () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    },
    [],
  );

  /** Tạo chat mới. `asTemporary` -> chat tạm, không lưu. */
  const newChat = useCallback(
    ({ asTemporary = false } = {}) => {
      abortRef.current?.abort();
      abortRef.current = null;
      streamingRef.current = false;
      setStreaming(false);
      setError(null);
      setDraft("");

      const conversation = chatStorage.createConversation();

      if (asTemporary) {
        temporaryRef.current = conversation;
        setTemporary(conversation);
        dataRef.current = { conversations: [], activeId: null };
        return conversation;
      }

      temporaryRef.current = null;
      setTemporary(null);
      const full = dataRef.current || EMPTY;
      const list = Array.isArray(full.conversations) ? full.conversations : [];
      const next = {
        ...full,
        conversations: [conversation, ...list],
        activeId: conversation.id,
      };
      dataRef.current = next;
      setData(next);
      chatStorage.set(next).catch(() => {});
      return conversation;
    },
    [persist],
  );

  const selectChat = useCallback(
    (id) => {
      abortRef.current?.abort();
      abortRef.current = null;
      setStreaming(false);
      setError(null);
      setTemporary(null);
      temporaryRef.current = null;
      persist({ ...dataRef.current, activeId: id }, { immediate: true });
    },
    [persist],
  );

  const renameChat = useCallback(
    (id, title) =>
      persist(chatStorage.renameConversation(dataRef.current, id, title), {
        immediate: true,
      }),
    [persist],
  );

  const removeChat = useCallback(
    (id) => {
      if (temporaryRef.current?.id === id) {
        temporaryRef.current = null;
        setTemporary(null);
        return;
      }
      persist(chatStorage.removeConversation(dataRef.current, id), { immediate: true });
    },
    [persist],
  );

  const clearAllChats = useCallback(() => {
    temporaryRef.current = null;
    setTemporary(null);
    persist(chatStorage.clearAll(), { immediate: true });
  }, [persist]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    streamingRef.current = false;
    setStreaming(false);
  }, []);

  /**
   * Gửi câu hỏi hiện tại và stream câu trả lời vào một bong bóng assistant.
   * Dùng chung cho cả chat thường lẫn chat tạm (`temporary`).
   */
  const send = useCallback(
    async (rawText) => {
      const text = (rawText ?? draftRef.current).trim();
      if (!text) return null;

      let conversation = activeRef.current || temporaryRef.current;
      let wantTemp = !!temporaryRef.current;
      if (!conversation) {
        const convNew = newChat({ asTemporary: wantTemp });
        if (wantTemp || temporaryRef.current) {
          conversation = temporaryRef.current || convNew;
          wantTemp = true;
        } else {
          conversation = dataRef.current?.conversations?.find((x) => x.id === convNew?.id) || convNew;
        }
      }
      const conversationId = conversation?.id;
      if (!conversationId) return null;
      wantTemp = wantTemp || temporaryRef.current?.id === conversationId;

      const userMessage = { id: newId("msg"), role: "user", content: text };
      const assistantMessage = { id: newId("msg"), role: "assistant", content: "" };

      const applyToState = (updater) => {
        if (temporaryRef.current?.id === conversationId) {
          setTemporary((cur) => {
            const base = cur || { id: conversationId, messages: [], title: 'New chat', createdAt: Date.now(), updatedAt: Date.now() };
            const next = updater(base);
            temporaryRef.current = next;
            return next;
          });
          return;
        }
        setData((cur) => {
          const full = cur || EMPTY;
          const list = Array.isArray(full.conversations) ? [...full.conversations] : [];
          const conv = list.find((c) => c.id === conversationId);
          let updated;
          if (!conv) {
            updated = updater({ id: conversationId, messages: [], title: 'New chat', createdAt: Date.now(), updatedAt: Date.now() });
            list.unshift(updated);
          } else {
            updated = updater(conv);
            const idx = list.findIndex((c) => c.id === conversationId);
            list[idx] = updated;
          }
          const next = { ...full, conversations: list, activeId: full.activeId || conversationId };
          dataRef.current = next;
          chatStorage.set(next).catch(() => {});
          return next;
        });
      };

      applyToState((c) => {
        const base = c || (temporaryRef.current?.id === conversationId ? temporaryRef.current : { id: conversationId, messages: [] });
        const msgs = Array.isArray(base?.messages) ? [...base.messages] : [];
        return { ...base, messages: [...msgs, userMessage, assistantMessage] };
      });
      setDraft("");
      setError(null);
      streamingRef.current = true;
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      let streamed = "";
      const history = [
        ...(Array.isArray(conversation?.messages) ? conversation.messages : []),
        userMessage,
      ].map((m) => ({ role: m.role, content: m.content }));

      try {
        const result = await sendChat(history, {
          signal: controller.signal,
          onDelta: (delta) => {
            streamed += delta;
            applyToState((c) => chatStorage.updateMessage(c, conversationId, assistantMessage.id, { content: streamed }));
          },
        });
        if (result?.text && streamed !== result.text) {
          streamed = result.text;
          applyToState((c) => chatStorage.updateMessage(c, conversationId, assistantMessage.id, { content: result.text }));
        }
      } catch (err) {
        if (err?.name === "AbortError" || err?.code === "aborted") {
          applyToState((c) => chatStorage.dropEmptyTail(c, conversationId));
        } else {
          const chatError = err instanceof ChatError ? err : new ChatError("unknown", err?.message);
          setError(chatError);
          applyToState((c) => chatStorage.updateMessage(c, conversationId, assistantMessage.id, { content: streamed, error: chatError.code }));
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          streamingRef.current = false;
          setStreaming(false);
        }
      }
    },
    [newChat],
  );

  /** Gửi lại câu hỏi cuối, bỏ câu trả lời cũ. */
  const retry = useCallback(() => {
    const messages = activeRef.current?.messages ?? [];
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return null;

    return send(lastUser.content);
  }, [send]);

  const value = useMemo(
    () => ({
      conversations: data.conversations,
      active,
      activeId: active?.id ?? null,
      temporary: !!temporary,
      loaded,
      draft,
      setDraft,
      streaming,
      error,
      clearError: () => setError(null),
      newChat,
      selectChat,
      renameChat,
      removeChat,
      clearAllChats,
      send,
      stop,
      retry,
    }),
    [
      data.conversations,
      active,
      temporary,
      loaded,
      draft,
      streaming,
      error,
      newChat,
      selectChat,
      renameChat,
      removeChat,
      clearAllChats,
      send,
      stop,
      retry,
    ],
  );

  return (
    <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>
  );
}
