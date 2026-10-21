/**
 * Chat service — lớp trừu tượng, adapter streaming đổi được.
 *
 * Adapter phải implement:
 *   chat(messages, { signal, onDelta }) => Promise<{ text, model }>
 *
 * - `messages`: [{ role: "user" | "assistant" | "system", content }]
 * - `onDelta(text)`: gọi nhiều lần khi có từng mẩu chữ mới
 * - phải tôn trọng `signal` (AbortSignal) để dừng giữa chừng
 *
 * Lỗi -> ném ChatError với code:
 *   "auth"        thiếu/sai API key
 *   "rate_limit"  vượt hạn mức
 *   "network"     không gọi được
 *   "unavailable" dịch vụ đang lỗi (5xx)
 *   "aborted"     người dùng bấm Stop
 *   "invalid"     request sai
 *   "unknown"
 */

export class ChatError extends Error {
  /** @param {"auth"|"rate_limit"|"network"|"unavailable"|"aborted"|"invalid"|"unknown"} code */
  constructor(code, message) {
    super(message);
    this.name = "ChatError";
    this.code = code;
  }
}

/** Map mã HTTP sang ChatError cho mọi adapter dùng chung. */
export function chatErrorFromStatus(status, body) {
  if (status === 401 || status === 403) {
    return new ChatError("auth", "The provider rejected the credentials.");
  }
  if (status === 429) {
    return new ChatError("rate_limit", "Rate limit reached. Try again shortly.");
  }
  if (status >= 500) {
    return new ChatError(
      "unavailable",
      `The provider is temporarily unavailable (${status}).`,
    );
  }

  const detail = body ? ` — ${body}` : "";
  return new ChatError("invalid", `Request failed (${status})${detail}`);
}

/**
 * Adapter mặc định: trả lời tại chỗ, không gọi mạng.
 *
 * Đủ để toàn bộ UI chat (streaming, stop, markdown, copy, lịch sử) hoạt
 * động và test được mà không cần key. Thay bằng adapter thật lúc khởi
 * động bằng `setChatAdapter()`.
 */
export function createEchoAdapter() {
  return {
    name: "echo (local demo)",
    model: "echo-1",

    async chat(messages, { signal, onDelta } = {}) {
      const last = [...messages].reverse().find((m) => m.role === "user");
      const prompt = last?.content?.trim() ?? "";

      const reply = prompt
        ? [
            `You said: **${prompt}**`,
            "",
            "This is the built-in demo adapter, so no model is actually called.",
            "Wire a real one with:",
            "",
            "```js",
            "setChatAdapter({ name: \"my-llm\", chat: (msgs, { signal, onDelta }) => ... })",
            "```",
            "",
            "Things the UI already handles: _streaming_, `code`, lists, and **bold**.",
          ].join("\n")
        : "Ask me something and I'll echo it back.";

      // Giả lập streaming: nhả từng mẩu nhỏ để thấy chữ chạy dần
      let text = "";
      const chunks = reply.match(/\S+\s*/g) ?? [];

      for (const chunk of chunks) {
        if (signal?.aborted) throw new ChatError("aborted", "Stopped");

        await new Promise((resolve) => setTimeout(resolve, 25));
        text += chunk;
        onDelta?.(chunk);
      }

      return { text, model: "echo-1" };
    },
  };
}

let active = null;

/** Đặt adapter đang dùng (khởi động, hoặc thay bằng adapter giả trong test). */
export function setChatAdapter(adapter) {
  active = adapter;
}

export function getChatAdapter() {
  return (active ??= createEchoAdapter());
}

/** Gửi hội thoại qua adapter đang hoạt động. */
export function sendChat(messages, options) {
  return getChatAdapter().chat(messages, options);
}
