/**
 * Settings schema — nguồn sự thật duy nhất.
 *
 * Mỗi setting là một object mô tả:
 *   type      "enum" | "number" | "boolean"
 *   default   giá trị mặc định (bắt buộc)
 *   label     nhãn hiển thị (UI)
 *   description  ghi chú ngắn (UI, tooltip)
 *   options   (enum) danh sách giá trị hợp lệ, dạng [{ value, label }]
 *   min/max/step  (number) miền giá trị và bước nhảy
 *   unit      (number) hậu tố hiển thị, ví dụ "px" hoặc "s"
 *
 * Mọi thứ khác (defaults, validate, coerce, UI) đều suy ra từ đây.
 * Thêm setting mới = thêm 1 entry; không cần sửa panel hay storage.
 */

export const SETTINGS_SCHEMA = {
  appearance: {
    label: "Appearance",
    description: "How the side panel looks.",
    settings: {
      theme: {
        type: "enum",
        default: "system",
        label: "Theme",
        description: "Follow the system or force light/dark.",
        options: [
          { value: "system", label: "System" },
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ],
      },
      fontSize: {
        type: "number",
        default: 14,
        label: "Font size",
        description: "Base text size across the panel.",
        min: 12,
        max: 20,
        step: 1,
        unit: "px",
      },
      compactMode: {
        type: "boolean",
        default: false,
        label: "Compact mode",
        description: "Tighter padding and spacing.",
      },
    },
  },

  general: {
    label: "General",
    description: "Language and regional preferences.",
    settings: {
      language: {
        type: "enum",
        default: "vi",
        label: "Interface language",
        description: "Language used for labels and messages.",
        options: [
          { value: "en", label: "English" },
          { value: "vi", label: "Tiếng Việt" },
        ],
      },
    },
  },

  transcription: {
    label: "Transcription",
    description: "Realtime speech-to-text capture.",
    settings: {
      model: {
        type: "enum",
        default: "base",
        label: "Whisper model",
        description: "Larger models are slower but more accurate.",
        options: [
          { value: "tiny", label: "Tiny (fastest)" },
          { value: "base", label: "Base (balanced)" },
          { value: "small", label: "Small (accurate)" },
          { value: "large", label: "Large (slowest)" },
        ],
      },
      mode: {
        type: "enum",
        default: "browser",
        label: "Capture mode",
        description: "Where audio chunks are processed.",
        options: [
          { value: "browser", label: "Browser (AudioWorklet)" },
          { value: "native", label: "Native" },
        ],
      },
      chunkSecond: {
        type: "number",
        default: 4,
        label: "Chunk length",
        description: "Audio sent to the backend per message.",
        min: 1,
        max: 10,
        step: 1,
        unit: "s",
      },
    },
  },
};

/* ---------------------------------------------------------------
   Suy ra từ schema
   --------------------------------------------------------------- */

/** Giá trị mặc định cho toàn bộ settings. */
export function buildDefaults(schema = SETTINGS_SCHEMA) {
  const out = {};
  for (const [group, def] of Object.entries(schema)) {
    out[group] = {};
    for (const [key, spec] of Object.entries(def.settings)) {
      out[group][key] = spec.default;
    }
  }
  return out;
}

export const DEFAULT_SETTINGS = buildDefaults();

/** Tra cứu spec của một setting. Trả undefined nếu không tồn tại. */
export function getSettingSpec(group, key, schema = SETTINGS_SCHEMA) {
  return schema[group]?.settings?.[key];
}

/** Duyệt phẳng mọi setting: [{ group, key, spec }] */
export function listSettings(schema = SETTINGS_SCHEMA) {
  return Object.entries(schema).flatMap(([group, def]) =>
    Object.entries(def.settings).map(([key, spec]) => ({ group, key, spec })),
  );
}

/**
 * Chuẩn hoá một giá trị về đúng kiểu, hoặc trả `undefined` nếu không hợp lệ.
 * Dùng cho cả validate khi ghi lẫn khi đọc lại từ storage.
 */
export function coerceSetting(spec, value) {
  if (!spec) return undefined;

  switch (spec.type) {
    case "boolean":
      if (typeof value === "boolean") return value;
      if (value === "true") return true;
      if (value === "false") return false;
      return undefined;

    case "number": {
      const num = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(num)) return undefined;
      const min = spec.min ?? -Infinity;
      const max = spec.max ?? Infinity;
      if (num < min || num > max) return undefined;
      return num;
    }

    case "enum":
      return spec.options.some((o) => o.value === value) ? value : undefined;

    default:
      return undefined;
  }
}

/** Kiểm tra nhanh một giá trị có được chấp nhận không. */
export function isValidSetting(group, key, value, schema = SETTINGS_SCHEMA) {
  return coerceSetting(getSettingSpec(group, key, schema), value) !== undefined;
}

/**
 * Làm sạch một object settings bất kỳ (ví dụ đọc từ storage):
 * bỏ nhóm/khoá lạ, thay giá trị sai kiểu bằng default.
 */
export function sanitizeSettings(raw, schema = SETTINGS_SCHEMA) {
  const out = buildDefaults(schema);

  for (const [group, def] of Object.entries(schema)) {
    const incoming = raw?.[group];
    if (!incoming || typeof incoming !== "object") continue;

    for (const [key, spec] of Object.entries(def.settings)) {
      if (!(key in incoming)) continue;
      const coerced = coerceSetting(spec, incoming[key]);
      if (coerced !== undefined) out[group][key] = coerced;
    }
  }

  return out;
}
