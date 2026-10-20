import { strict as assert } from "node:assert";
import { test } from "node:test";
import { JSDOM } from "jsdom";

/**
 * Smoke test UI: render từng feature panel vào jsdom thật và kiểm tra
 * DOM + tương tác cơ bản (click, nhập liệu). Không cần trình duyệt.
 */

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
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Node = dom.window.Node;
  globalThis.Event = dom.window.Event;
  globalThis.MouseEvent = dom.window.MouseEvent;
  globalThis.KeyboardEvent = dom.window.KeyboardEvent;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  const { act } = await import("react");
  const ReactDOMClient = await import("react-dom/client");
  return { dom, act, ReactDOMClient };
}

function q(sel) {
  return document.querySelector(sel);
}

function all(sel) {
  return [...document.querySelectorAll(sel)];
}

function click(el) {
  el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
}

function type(el, value) {
  const proto =
    el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement : window.HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(proto.prototype, "value").set;
  setter.call(el, value);
  el.dispatchEvent(new window.Event("input", { bubbles: true }));
}

test("mỗi tab render đầy đủ UI và tương tác được", async () => {
  const { act, ReactDOMClient } = await setup();
  const { createElement: h } = await import("react");

  const App = (await import("@/app/App.jsx")).default;

  await act(async () => {
    ReactDOMClient.createRoot(q("#root")).render(h(App));
  });

  // --- shell ---
  assert.ok(q(".app"), "app shell tồn tại");
  assert.ok(q(".sidebar"), "sidebar tồn tại");
  assert.ok(q(".sidebar-menu button"), "sidebar có tab");
  const navButtons = all(".sidebar-menu button");
  assert.equal(navButtons.length, 6, "sidebar-menu có 6 tab chính");
  assert.equal(all(".sidebar-footer button").length, 2, "sidebar-footer có 2 tab phụ");

  // --- Home (tab mặc định, index 0 = Realtime) ---
  // Trang Home nằm ở tab index 2 — điều hướng bằng click
  const homeIndex = navButtons.findIndex((b) => b.textContent.includes("Home"));
  assert.ok(homeIndex >= 0, "có nút Home");

  await act(async () => click(navButtons[homeIndex]));

  assert.ok(q(".panel-header"), "panel header render");
  assert.ok(q(".panel-heading-icon svg"), "header có icon");
  assert.ok(q(".badge"), "header có badge version");
  assert.ok(q(".hero"), "home có hero");
  assert.ok(q(".hero .chip"), "hero có chip phím tắt");
  assert.ok(all(".container button.card").length >= 6, "home có card cho mọi tool");  assert.ok(q(".card-icon svg"), "card có icon");
  assert.ok(q(".card-title"), "card có title");
  assert.ok(q(".card-desc"), "card có description");

  // card điều hướng sang tab khác
  const targetCard = all(".container button.card").find((c) =>
    c.textContent.includes("Translate"),
  );
  await act(async () => click(targetCard));

  // --- Translate ---
  assert.ok(q(".toolbar"), "translate có toolbar");
  assert.ok(all(".toolbar select").length === 2, "translate có 2 select ngôn ngữ");
  assert.ok(q(".toolbar .btn-icon"), "translate có nút swap");
  assert.ok(q(".char-count"), "translate có char counter");
  assert.ok(all(".split .box").length === 2, "translate có 2 box");
  assert.ok(q(".box-head .btn-text"), "translate có nút Clear/Copy");

  const [src] = all(".split textarea");
  await act(async () => type(src, "hello world"));
  assert.match(q(".char-count").textContent, /11 \/ 5000/, "counter cập nhật");

  const swap = q(".toolbar .btn-icon");
  await act(async () => click(swap));
  assert.equal(all(".split textarea")[0].value, "", "swap đưa kết quả sang ô nguồn");

  await act(async () => type(src, "hello"));
  const [, toSel] = all(".toolbar select");
  assert.equal(all(".toolbar select option").filter((o) => o.value === "auto").length, 1,
    "chỉ select nguồn có 'Detect language'");

  await act(async () => {
    toSel.value = "ja";
    toSel.dispatchEvent(new window.Event("change", { bubbles: true }));
  });

  const translateBtn = all(".actions button")[0];
  assert.ok(translateBtn, "có nút Translate");
  await act(async () => click(translateBtn));
  assert.ok(q(".hint-info"), "bấm Translate hiện thông báo trạng thái");

  // --- Rewrite ---
  const rewriteIndex = all(".sidebar-menu button").findIndex((b) =>
    b.textContent.includes("Rewrite"),
  );
  await act(async () => click(all(".sidebar-menu button")[rewriteIndex]));
  assert.ok(q(".toolbar select"), "rewrite có select style");
  assert.ok(all(".split textarea").length === 2, "rewrite có 2 editor");
  const rwBtn = all(".actions button")[0];
  assert.equal(rwBtn.disabled, true, "nút Rewrite disabled khi rỗng");
  await act(async () => type(all(".split textarea")[0], "make this formal"));
  assert.equal(all(".actions button")[0].disabled, false, "nút Rewrite bật khi có text");
  await act(async () => click(all(".actions button")[0]));
  assert.ok(q(".hint-info"), "bấm Rewrite hiện thông báo");

  // --- Account ---
  const accountIndex = all(".sidebar-footer button").findIndex((b) =>
    b.textContent.includes("Account"),
  );
  await act(async () => click(all(".sidebar-footer button")[accountIndex]));
  assert.ok(q(".auth"), "account có form auth");
  assert.ok(q(".auth-avatar"), "account có avatar");
  assert.ok(q(".auth-heading h2"), "account có heading");
  assert.equal(all(".auth input").length, 2, "signin: email + password");
  const toggle = q(".auth .btn-text");
  await act(async () => click(toggle));
  assert.equal(all(".auth input").length, 3, "signup: thêm field name");
  await act(async () => type(q("#acc-name"), "Nguyen Van A"));
  assert.equal(q(".auth-avatar").textContent, "NV", "avatar lấy initials từ tên");

  // --- Settings ---
  const settingsIndex = all(".sidebar-footer button").findIndex((b) =>
    b.textContent.includes("Settings"),
  );
  await act(async () => click(all(".sidebar-footer button")[settingsIndex]));
  const groups = all(".settings-group");
  assert.equal(groups.length, 3, "settings có 3 nhóm");
  assert.ok(q(".switch input[type=checkbox]"), "settings có switch compact");
  assert.ok(q("input[type=range]"), "settings có range");

  const fontSize = q("#set-appearance-fontSize");
  await act(async () => type(fontSize, "18"));
  assert.match(q("#set-appearance-fontSize").previousElementSibling.textContent, /18px/,
    "label font-size cập nhật");
  assert.equal(document.documentElement.style.getPropertyValue("--font-size"), "18px",
    "theme effect set --font-size lên root");

  const themeSel = q("#set-appearance-theme");
  await act(async () => {
    themeSel.value = "dark";
    themeSel.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  assert.equal(document.documentElement.dataset.theme, "dark", "theme effect set data-theme");
  assert.equal(document.documentElement.style.colorScheme, "dark", "color-scheme dark");

  const compact = q("#set-appearance-compactMode");
  await act(async () => click(compact));
  assert.equal(document.documentElement.dataset.compact, "true", "compact mode bật");

  const resetBtn = all(".actions button")[0];
  await act(async () => click(resetBtn));
  assert.equal(document.documentElement.dataset.theme, "system", "reset về default theme");

  // localStorage là persistence ở chế độ browser
  assert.ok(localStorage.getItem("app-settings"), "settings được lưu vào localStorage");

  // --- Realtime ---
  const liveIndex = all(".sidebar-menu button").findIndex((b) =>
    b.textContent.includes("Realtime"),
  );
  await act(async () => click(all(".sidebar-menu button")[liveIndex]));
  assert.ok(q(".controller"), "live có controller");
  assert.equal(all(".controller select").length, 2, "live có 2 select");
  assert.ok(q(".controller .action button"), "live có nút Start/Stop");
  assert.ok(q("textarea.transcript"), "live có transcript dùng class thay vì inline style");
  assert.equal(q("textarea.transcript").getAttribute("style"), null, "không còn inline style");
  assert.ok(q(".status"), "live có status");
  assert.ok(q(".status").textContent.length > 0, "status có nội dung");

  // --- keyboard shortcuts ---
  await act(async () => {
    document.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "ArrowRight", ctrlKey: true, bubbles: true }),
    );
  });
  assert.ok(q(".panel h1"), "shortcut Ctrl+→ đổi tab không lỗi");

  await act(async () => {
    document.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "ArrowLeft", ctrlKey: true, bubbles: true }),
    );
  });
  assert.ok(q(".panel h1"), "shortcut Ctrl+← hoạt động");

  // collapse sidebar
  const collapseBtn = q(".sidebar-collapse");
  await act(async () => click(collapseBtn));
  assert.ok(q(".sidebar.collapse"), "sidebar collapse được");
});
