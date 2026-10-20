import { strict as assert } from "node:assert";
import { test } from "node:test";
import { JSDOM } from "jsdom";

import { LookupError } from "@/features/lookup/services/lookupService";

/**
 * Adapter giả — kiểm soát hoàn toàn kết quả, không gọi mạng.
 */
function fakeAdapter(handler) {
  return {
    name: "fake",
    lookup: async (word, options) => handler(word, options),
  };
}

function entryFor(word) {
  return {
    word,
    phonetic: `/${word}/`,
    audio: null,
    source: "fake",
    meanings: [
      {
        partOfSpeech: "noun",
        definitions: [{ definition: `${word} means something`, example: `a ${word} here` }],
        synonyms: [`${word}ish`],
      },
    ],
  };
}

async function setup() {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true,
    writable: true,
  });
  for (const key of [
    "HTMLElement", "Node", "Event", "MouseEvent", "KeyboardEvent",
    "HTMLInputElement", "AbortController", "AbortSignal",
  ]) {
    globalThis[key] = dom.window[key];
  }
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  return { dom, act, createRoot };
}

const q = (sel) => document.querySelector(sel);
const all = (sel) => [...document.querySelectorAll(sel)];


async function type(el, value, act) {
  await act(async () => {
    const proto = window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    el.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
}

async function click(el, act) {
  await act(async () => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

const goto = (label, act) =>
  click(all(".sidebar-menu button").find((b) => b.textContent.includes(label)), act);

test("lookup: tra từ, lịch sử, yêu thích qua adapter giả", async () => {
  const { act, createRoot } = await setup();
  const { createElement: h } = await import("react");

  const { setLookupAdapter } = await import("@/features/lookup/services/lookupService");
  setLookupAdapter(fakeAdapter(async (word) => entryFor(word)));

  const App = (await import("@/app/App.jsx")).default;
  await act(async () => createRoot(q("#root")).render(h(App)));

  await goto("Lookup", act);
  assert.equal(q(".panel h1").textContent, "Lookup", "ở tab Lookup");
  assert.ok(q(".lookup-bar input"), "có ô nhập");
  assert.ok(q(".lookup-bar button[type=submit]"), "có nút Look up");
  assert.ok(q(".lookup-state"), "có trạng thái rỗng ban đầu");

  // --- tra từ ---
  const input = q(".lookup-bar input");
  await type(input, "hello", act);
  await click(q(".lookup-bar button[type=submit]"), act);

  assert.ok(q(".lookup-card"), "hiện kết quả");
  assert.equal(q(".lookup-title h2").textContent, "hello", "hiện đúng từ");
  assert.equal(q(".phonetic").textContent, "/hello/", "hiện phiên âm");
  assert.ok(q(".part-of-speech"), "hiện từ loại");
  assert.deepEqual(all(".part-of-speech").map((e) => e.textContent), ["noun"]);
  assert.ok(q(".definitions li p").textContent.includes("means something"), "hiện định nghĩa");
  assert.ok(q(".example").textContent.includes("a hello here"), "hiện ví dụ");
  assert.ok(q(".synonyms .chip").textContent.includes("helloish"), "hiện đồng nghĩa");
  assert.ok(q(".lookup-foot").textContent.includes("fake"), "hiện nguồn");

  // --- lịch sử ---
  assert.ok(q(".lookup-history"), "có khối lịch sử");
  const historyChips = all(".lookup-history .chip-button");
  assert.equal(historyChips.length, 1, "lịch sử có 1 mục");
  assert.equal(historyChips[0].textContent, "hello");

  // --- tra từ thứ hai, lịch sử đẩy lên đầu, khử trùng lặp ---
  await type(input, "world", act);
  await click(q(".lookup-bar button[type=submit]"), act);
  assert.deepEqual(
    all(".lookup-history .chip-button").map((c) => c.textContent),
    ["world", "hello"],
    "mục mới lên đầu",
  );

  await type(input, "hello", act);
  await click(q(".lookup-bar button[type=submit]"), act);
  assert.deepEqual(
    all(".lookup-history .chip-button").map((c) => c.textContent),
    ["hello", "world"],
    "tra lại từ cũ thì không nhân đôi, chỉ đẩy lên đầu",
  );

  // lịch sử bấm được để tra lại
  await click(all(".lookup-history .chip-button")[1], act);
  assert.equal(q(".lookup-title h2").textContent, "world", "bấm chip lịch sử tra lại từ đó");

  // --- yêu thích ---
  const saveBtn = all(".lookup-head-actions .btn-text")[0];
  assert.ok(saveBtn.textContent.includes("Save"), "nút Save ban đầu chưa lưu");
  await click(saveBtn, act);
  assert.ok(
    all(".lookup-head-actions .btn-text")[0].textContent.includes("Saved"),
    "sau khi lưu hiện Saved",
  );
  assert.ok(all(".lookup-head-actions .btn-text")[0].getAttribute("aria-pressed") === "true");

  // --- tab Favorites riêng ---
  await goto("Favorites", act);
  assert.equal(q(".panel h1").textContent, "Favorites", "ở tab Favorites");
  assert.equal(all(".favorite-item").length, 1, "có 1 từ yêu thích");
  assert.equal(q(".favorite-term").textContent, "world");
  assert.ok(q(".favorite-item .phonetic").textContent.includes("/world/"), "hiện phiên âm");

  // bấm từ yêu thích để tra lại -> nhảy sang tab Lookup? (không, chỉ đổi kết quả)
  await click(q(".favorite-word"), act);
  assert.equal(all(".favorite-item").length, 1, "vẫn ở Favorites");

  await goto("Lookup", act);
  assert.equal(q(".lookup-title h2").textContent, "world", "kết quả đổi theo từ đã chọn");

  // bỏ yêu thích ngay trên tab Lookup
  await click(all(".lookup-head-actions .btn-text")[0], act);
  await goto("Favorites", act);
  assert.ok(q(".lookup-state"), "hết yêu thích thì hiện trạng thái rỗng");

  // --- lỗi not_found ---
  setLookupAdapter(fakeAdapter(async (word) => {
    throw new LookupError("not_found", `No entry for “${word}”`);
  }));
  await goto("Lookup", act);
  await type(q(".lookup-bar input"), "zzz", act);
  await click(q(".lookup-bar button[type=submit]"), act);
  assert.ok(q(".lookup-state-error"), "hiện lỗi");
  assert.ok(q(".lookup-state-error").textContent.includes("No entry"), "hiện thông báo not_found");
  assert.equal(q(".lookup-card"), null, "không còn kết quả cũ");

  // --- lỗi mạng ---
  setLookupAdapter(fakeAdapter(async () => {
    throw new LookupError("network", "Could not reach the dictionary service");
  }));
  await type(q(".lookup-bar input"), "abc", act);
  await click(q(".lookup-bar button[type=submit]"), act);
  assert.ok(q(".lookup-state-error").textContent.includes("Lookup failed"), "hiện lỗi mạng");
  assert.ok(
    q(".lookup-state-error").textContent.includes("Check your connection"),
    "gợi ý kiểm tra kết nối",
  );

  // --- persistence ---
  const stored = JSON.parse(localStorage.getItem("lookup-data"));
  assert.ok(Array.isArray(stored.history) && stored.history.length > 0, "lịch sử được lưu");
  assert.ok(Array.isArray(stored.favorites), "danh sách yêu thích được lưu (đã rỗng sau khi bỏ)");

  // --- xoá lịch sử ---
  setLookupAdapter(fakeAdapter(async (word) => entryFor(word)));
  await type(q(".lookup-bar input"), "one", act);
  await click(q(".lookup-bar button[type=submit]"), act);
  assert.ok(q(".lookup-history"), "có lịch sử trở lại");
  await click(q(".lookup-history .btn-text"), act);
  assert.equal(q(".lookup-history"), null, "Clear history xoá hết lịch sử");
});

test("lookup: lỗi 5xx của dịch vụ -> unavailable, không phải lỗi kết nối", async () => {
  const { createDictionaryApiAdapter } = await import(
    "@/features/lookup/services/lookupService"
  );

  const originalFetch = globalThis.fetch;
  const statuses = [502, 503, 530];

  try {
    for (const status of statuses) {
      globalThis.fetch = async () => ({ ok: false, status, json: async () => ({}) });
      const adapter = createDictionaryApiAdapter({ baseUrl: "https://example.test" });

      await assert.rejects(
        () => adapter.lookup("hello"),
        (err) => {
          assert.equal(err.name, "LookupError");
          assert.equal(err.code, "unavailable", `status ${status} -> unavailable`);
          assert.ok(err.message.includes(String(status)), "thông báo có mã lỗi");
          return true;
        },
      );
    }

    // 404 vẫn là not_found
    globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
    await assert.rejects(
      () => createDictionaryApiAdapter({ baseUrl: "https://example.test" }).lookup("zzz"),
      (err) => err.code === "not_found",
    );

    // fetch ném lỗi -> network
    globalThis.fetch = async () => {
      throw new TypeError("Failed to fetch");
    };
    await assert.rejects(
      () => createDictionaryApiAdapter({ baseUrl: "https://example.test" }).lookup("hello"),
      (err) => err.code === "network",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("lookup: adapter mặc định trỏ tới dictionaryapi.dev", async () => {
  const { createDictionaryApiAdapter, normalizeDictionaryApi } = await import(
    "@/features/lookup/services/lookupService"
  );

  const adapter = createDictionaryApiAdapter();
  assert.equal(adapter.name, "dictionaryapi.dev");

  // normalize payload thô
  const normalized = normalizeDictionaryApi(
    [
      {
        word: "hello",
        phonetic: "/həˈloʊ/",
        phonetics: [{ text: "/həˈloʊ/", audio: "https://example.test/hello.mp3" }],
        meanings: [
          {
            partOfSpeech: "noun",
            definitions: [{ definition: "a greeting", example: "she said hello" }],
            synonyms: ["hi"],
          },
        ],
      },
    ],
    "hello",
  );

  assert.equal(normalized.word, "hello");
  assert.equal(normalized.phonetic, "/həˈloʊ/");
  assert.equal(normalized.audio, "https://example.test/hello.mp3");
  assert.equal(normalized.meanings.length, 1);
  assert.equal(normalized.meanings[0].partOfSpeech, "noun");
  assert.deepEqual(normalized.meanings[0].synonyms, ["hi"]);
});

test("lookup: normalize chịu được payload thiếu/hỏng", async () => {
  const { normalizeDictionaryApi, LookupError } = await import(
    "@/features/lookup/services/lookupService"
  );
  const { strict: s } = assert;

  for (const bad of [null, [], [{}], [{ meanings: [] }]]) {
    s.throws(
      () => normalizeDictionaryApi(bad, "x"),
      (err) => err instanceof LookupError && err.code === "not_found",
      `payload ${JSON.stringify(bad)} -> not_found`,
    );
  }

  // định nghĩa rỗng bị loại, giữ nghĩa hợp lệ
  const partial = normalizeDictionaryApi(
    [
      {
        word: "x",
        meanings: [
          { partOfSpeech: "verb", definitions: [{ definition: "" }, { definition: "ok" }] },
          { partOfSpeech: "noun", definitions: [] },
        ],
      },
    ],
    "x",
  );
  s.equal(partial.meanings.length, 1, "chỉ giữ nghĩa có definition");
  s.equal(partial.meanings[0].definitions.length, 1, "bỏ definition rỗng");
});
