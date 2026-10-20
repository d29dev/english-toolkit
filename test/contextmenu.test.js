import { strict as assert } from "node:assert";
import { test } from "node:test";
import { JSDOM } from "jsdom";

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
    "HTMLInputElement", "getSelection",
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

function rightClick(el, x = 120, y = 90) {
  el.dispatchEvent(
    new window.MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    }),
  );
}

function key(k) {
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }),
  );
}

function itemByLabel(label) {
  return all(".contextmenu-item").find((b) => b.textContent.includes(label));
}

test("context menu: mở, nội dung, hành động, đóng", async () => {
  const { act, createRoot } = await setup();
  const { createElement: h } = await import("react");
  const App = (await import("@/app/App.jsx")).default;

  await act(async () => {
    createRoot(q("#root")).render(h(App));
  });

  assert.equal(q(".contextmenu"), null, "ban đầu menu đóng");

  // Mở bằng chuột phải trong panel
  await act(async () => rightClick(q(".panel"), 150, 100));
  assert.ok(q(".contextmenu"), "chuột phải mở menu");
  assert.equal(q(".contextmenu").getAttribute("role"), "menu", "có role=menu");

  const items = all(".contextmenu-item");
  assert.ok(items.length >= 6, `menu có ${items.length} item`);
  assert.ok(all(".contextmenu-separator").length >= 2, "có separator");

  for (const label of [
    "Next tool", "Previous tool", "Go to Home",
    "Open Settings", "Copy selection", "Clear selection", "Reset settings",
  ]) {
    assert.ok(itemByLabel(label), `có item "${label}"`);
  }

  // Shortcut hint hiển thị trên item điều hướng
  assert.ok(itemByLabel("Next tool").textContent.includes("Ctrl + →"), "có hint Ctrl + →");

  // Vị trí đặt theo con trỏ
  assert.equal(q(".contextmenu").style.left, "150px");
  assert.equal(q(".contextmenu").style.top, "100px");

  // Item đầu được focus sẵn (dùng được bằng bàn phím)
  assert.equal(document.activeElement, all(".contextmenu-item")[0], "focus item đầu");

  // ---- hành động: Next tool ----
  const before = q(".panel h1").textContent;
  await act(async () => itemByLabel("Next tool").dispatchEvent(
    new window.MouseEvent("click", { bubbles: true }),
  ));
  assert.equal(q(".contextmenu"), null, "chọn item thì menu đóng");
  assert.notEqual(q(".panel h1").textContent, before, "Next tool đổi tab");

  // ---- hành động: Open Settings ----
  await act(async () => rightClick(q(".panel")));
  await act(async () => itemByLabel("Open Settings").dispatchEvent(
    new window.MouseEvent("click", { bubbles: true }),
  ));
  assert.equal(q(".panel h1").textContent, "Settings", "Open Settings nhảy đúng tab");

  // ---- hành động: Go to Home ----
  await act(async () => rightClick(q(".panel")));
  await act(async () => itemByLabel("Go to Home").dispatchEvent(
    new window.MouseEvent("click", { bubbles: true }),
  ));
  assert.equal(q(".panel h1").textContent, "Home", "Go to Home nhảy đúng tab");

  // ---- hành động: Reset settings ----
  await act(async () => rightClick(q(".panel")));
  const themeSel = (await act(async () => {
    itemByLabel("Open Settings").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  }), q("#set-appearance-theme"));
  await act(async () => {
    const set = Object.getOwnPropertyDescriptor(
      window.HTMLSelectElement.prototype, "value",
    ).set;
    set.call(themeSel, "dark");
    themeSel.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  assert.equal(document.documentElement.dataset.theme, "dark", "theme đổi trước khi reset");

  await act(async () => rightClick(q(".panel")));
  assert.ok(itemByLabel("Reset settings").classList.contains("contextmenu-item-danger"),
    "Reset settings là item nguy hiểm");
  await act(async () => itemByLabel("Reset settings").dispatchEvent(
    new window.MouseEvent("click", { bubbles: true }),
  ));
  assert.equal(document.documentElement.dataset.theme, "system", "Reset settings khôi phục default");

  // ---- Esc đóng menu ----
  await act(async () => rightClick(q(".panel")));
  assert.ok(q(".contextmenu"), "menu mở lại");
  await act(async () => key("Escape"));
  assert.equal(q(".contextmenu"), null, "Esc đóng menu");

  // ---- click ra ngoài đóng menu ----
  await act(async () => rightClick(q(".panel")));
  await act(async () => q(".context-overlay").dispatchEvent(
    new window.MouseEvent("mousedown", { bubbles: true }),
  ));
  assert.equal(q(".contextmenu"), null, "click overlay đóng menu");

  // ---- chuột phải trong menu không mở lại menu mới ----
  await act(async () => rightClick(q(".panel")));
  await act(async () => rightClick(q(".contextmenu")));
  assert.ok(q(".contextmenu"), "vẫn còn 1 menu, không nhân đôi");
  assert.equal(all(".contextmenu").length, 1, "chỉ có duy nhất một menu");

  // ---- điều hướng bằng bàn phím ----
  const opts = all(".contextmenu-item");
  assert.equal(document.activeElement, opts[0], "bắt đầu ở item đầu");
  await act(async () => key("ArrowDown"));
  assert.equal(document.activeElement, opts[1], "ArrowDown xuống item 2");
  await act(async () => key("End"));
  assert.equal(document.activeElement, opts[opts.length - 1], "End xuống cuối");
  await act(async () => key("ArrowDown"));
  assert.equal(document.activeElement, opts[0], "ArrowDown ở cuối quay về đầu");
  await act(async () => key("ArrowUp"));
  assert.equal(document.activeElement, opts[opts.length - 1], "ArrowUp ở đầu nhảy xuống cuối");
  await act(async () => key("Home"));
  assert.equal(document.activeElement, opts[0], "Home về đầu");

  // ---- đóng khi resize ----
  await act(async () => {
    window.dispatchEvent(new window.Event("resize"));
  });
  assert.equal(q(".contextmenu"), null, "resize đóng menu");

  // ---- sidebar cũng mở được menu ----
  await act(async () => rightClick(q(".sidebar")));
  assert.ok(q(".contextmenu"), "chuột phải sidebar mở menu");
  await act(async () => key("Escape"));
});
