import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  DEFAULT_SETTINGS,
  SETTINGS_SCHEMA,
  buildDefaults,
  coerceSetting,
  getSettingSpec,
  isValidSetting,
  listSettings,
  sanitizeSettings,
} from "@/core/settings/schema";

test("mọi setting trong schema đều hợp lệ về cấu trúc", () => {
  const specs = listSettings();
  assert.ok(specs.length >= 7, `có ${specs.length} setting`);

  for (const { group, key, spec } of specs) {
    assert.ok(["enum", "number", "boolean", "string", "stringList"].includes(spec.type),
      `${group}.${key} có type hợp lệ`);
    assert.ok(spec.default !== undefined, `${group}.${key} có default`);
    assert.ok(spec.label, `${group}.${key} có label`);

    if (spec.type === "enum") {
      assert.ok(Array.isArray(spec.options) && spec.options.length > 0,
        `${group}.${key} có options`);
      assert.ok(
        spec.options.some((o) => o.value === spec.default),
        `${group}.${key} default nằm trong options`,
      );
      for (const o of spec.options) {
        assert.ok(o.value !== undefined && o.label, `option của ${group}.${key} đầy đủ`);
      }
    }

    if (spec.type === "number") {
      assert.equal(typeof spec.default, "number", `${group}.${key} default là number`);
      assert.equal(typeof spec.min, "number", `${group}.${key} có min`);
      assert.equal(typeof spec.max, "number", `${group}.${key} có max`);
      assert.ok(spec.min <= spec.default && spec.default <= spec.max,
        `${group}.${key} default nằm trong [min, max]`);
    }

    if (spec.type === "boolean") {
      assert.equal(typeof spec.default, "boolean", `${group}.{key} default là boolean`);
    }

    if (spec.type === "string") {
      assert.equal(typeof spec.default, "string", `${group}.${key} default là string`);
    }

    if (spec.type === "stringList") {
      assert.ok(Array.isArray(spec.default), `${group}.${key} default là array`);
      assert.ok(spec.default.every((item) => typeof item === "string"),
        `${group}.${key} default chỉ chứa string`);
    }

    // default phải tự validate được — nếu không, schema tự mâu thuẫn
    assert.notEqual(coerceSetting(spec, spec.default), undefined,
      `${group}.${key} default vượt qua được coerce`);
  }
});

test("buildDefaults lấy đúng default từ schema", () => {
  const defaults = buildDefaults();
  assert.deepEqual(defaults, DEFAULT_SETTINGS);
  assert.equal(defaults.appearance.theme, "system");
  assert.equal(defaults.transcription.chunkSecond, 4);
  assert.equal(defaults.general.language, "vi");

  // phải là bản copy, không chia sẻ tham chiếu với default trong schema
  defaults.appearance.theme = "dark";
  assert.equal(buildDefaults().appearance.theme, "system", "không rò rỉ mutation");
});

test("coerceSetting: enum chỉ nhận giá trị trong options", () => {
  const spec = getSettingSpec("appearance", "theme");
  assert.equal(coerceSetting(spec, "dark"), "dark");
  assert.equal(coerceSetting(spec, "solar"), undefined, "giá trị ngoài options bị từ chối");
  assert.equal(coerceSetting(spec, ""), undefined);
  assert.equal(coerceSetting(spec, 1), undefined);
  assert.equal(coerceSetting(spec, null), undefined);
});

test("coerceSetting: number ép kiểu và chặn ngoài min/max", () => {
  const spec = getSettingSpec("appearance", "fontSize");
  assert.equal(coerceSetting(spec, 16), 16);
  assert.equal(coerceSetting(spec, "16"), 16, "chuỗi số được ép");
  assert.equal(coerceSetting(spec, 11), undefined, "dưới min bị từ chối");
  assert.equal(coerceSetting(spec, 21), undefined, "trên max bị từ chối");
  assert.equal(coerceSetting(spec, "abc"), undefined);
  assert.equal(coerceSetting(spec, NaN), undefined);
  assert.equal(coerceSetting(spec, Infinity), undefined);
  assert.equal(coerceSetting(spec, 12), 12, "biên dưới hợp lệ");
  assert.equal(coerceSetting(spec, 20), 20, "biên trên hợp lệ");
});

test("coerceSetting: boolean nhận boolean và chuỗi 'true'/'false'", () => {
  const spec = getSettingSpec("appearance", "compactMode");
  assert.equal(coerceSetting(spec, true), true);
  assert.equal(coerceSetting(spec, false), false);
  assert.equal(coerceSetting(spec, "true"), true);
  assert.equal(coerceSetting(spec, "false"), false);
  assert.equal(coerceSetting(spec, "yes"), undefined);
  assert.equal(coerceSetting(spec, 1), undefined);
});

test("coerceSetting: spec không tồn tại thì trả undefined", () => {
  assert.equal(coerceSetting(undefined, "anything"), undefined);
  assert.equal(coerceSetting(getSettingSpec("appearance", "nope"), "x"), undefined);
  assert.equal(getSettingSpec("nope", "theme"), undefined);
});

test("isValidSetting là lớp mỏng trên coerceSetting", () => {
  assert.equal(isValidSetting("appearance", "theme", "dark"), true);
  assert.equal(isValidSetting("appearance", "theme", "neon"), false);
  assert.equal(isValidSetting("appearance", "unknownKey", "dark"), false);
  assert.equal(isValidSetting("unknownGroup", "theme", "dark"), false);
});

test("sanitizeSettings: bỏ nhóm/khoá lạ, default cho giá trị sai", () => {
  const cleaned = sanitizeSettings({
    appearance: { theme: "dark", fontSize: 999, bogus: true },
    transcription: { chunkSecond: "6" },
    hacked: { whatever: 1 },
  });

  assert.equal(cleaned.appearance.theme, "dark", "giá trị hợp lệ được giữ");
  assert.equal(cleaned.appearance.fontSize, 14, "ngoài miền -> về default");
  assert.equal(cleaned.appearance.compactMode, false, "khoá thiếu -> default");
  assert.equal(cleaned.transcription.chunkSecond, 6, "chuỗi số hợp lệ được ép");
  assert.equal(cleaned.general.language, "vi", "nhóm thiếu -> default");
  assert.equal("bogus" in cleaned.appearance, false, "khoá lạ bị bỏ");
  assert.equal("hacked" in cleaned, false, "nhóm lạ bị bỏ");
  assert.deepEqual(Object.keys(cleaned), Object.keys(SETTINGS_SCHEMA),
    "chỉ còn đúng các nhóm trong schema");
});

test("sanitizeSettings chịu được dữ liệu hỏng từ storage", () => {
  for (const bad of [undefined, null, "not json", 42, [], { appearance: "nope" }]) {
    const cleaned = sanitizeSettings(bad);
    assert.deepEqual(cleaned, DEFAULT_SETTINGS, `đầu vào ${JSON.stringify(bad)} -> defaults`);
  }
});

test("sanitizeSettings không làm hỏng object gốc", () => {
  const raw = { appearance: { theme: "dark" } };
  const snapshot = structuredClone(raw);
  sanitizeSettings(raw);
  assert.deepEqual(raw, snapshot, "đầu vào không bị mutate");
});
