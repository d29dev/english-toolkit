/**
 * Lookup service — lớp trừu tượng, adapter đổi được.
 *
 * Mọi adapter phải implement: lookup(word, { signal }) => LookupResult
 *
 * LookupResult = {
 *   word: string,                     // từ đã tra (chuẩn hoá)
 *   phonetic: string | null,          // phiên âm, ví dụ "/həˈloʊ/"
 *   audio: string | null,             // URL file phát âm
 *   source: string,                   // tên adapter đã trả kết quả
 *   meanings: [{
 *     partOfSpeech: string,           // "noun", "verb", ...
 *     definitions: [{ definition, example }],
 *     synonyms: string[],
 *   }],
 * }
 *
 * Không tìm thấy từ -> adapter ném LookupError với code "not_found".
 */

export class LookupError extends Error {
  /** @param {"not_found" | "network" | "invalid" | "unavailable" | "unknown"} code */
  constructor(code, message) {
    super(message);
    this.name = "LookupError";
    this.code = code;
  }
}

/** Adapter mặc định: dictionaryapi.dev (miễn phí, không cần key). */
export function createDictionaryApiAdapter({ baseUrl } = {}) {
  const fromEnv =
    typeof import.meta.env?.VITE_LOOKUP_URL === "string"
      ? import.meta.env.VITE_LOOKUP_URL
      : "";

  const endpoint = baseUrl || fromEnv || "https://dict.minhqnd.com/api/v1/lookup?word=";

  return {
    name: "dictionaryapi.dev",

    async lookup(word, { signal } = {}) {
      const term = word.trim().toLowerCase();
      if (!term) {
        throw new LookupError("invalid", "Empty query");
      }

      let response;
      try {
        // response = await fetch(`${endpoint}/${encodeURIComponent(term)}`, { signal });
        response = await fetch(`${endpoint}${encodeURIComponent(term)}`, { signal });
      } catch (error) {
        if (error?.name === "AbortError") throw error;
        throw new LookupError("network", "Could not reach the dictionary service");
      }

      if (response.status === 404) {
        throw new LookupError("not_found", `No entry for “${term}”`);
      }

      // Cloudflare/origin lỗi tạm thời (502/503/530...) — không phải lỗi của người dùng
      if (response.status >= 500) {
        throw new LookupError(
          "unavailable",
          `Dictionary service is temporarily unavailable (${response.status})`,
        );
      }

      if (!response.ok) {
        throw new LookupError("network", `Dictionary service error (${response.status})`);
      }

      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new LookupError("unknown", "Malformed response");
      }

      return normalizeDictionaryApi(payload, term);
    },
  };
}

/** Chuyển payload thô của dictionaryapi.dev về LookupResult. */
// export function normalizeDictionaryApi(payload, fallbackWord) {
  // const entries = Array.isArray(payload) ? payload : [];
  // const meanings = [];
  // let phonetic = null;
  // let audio = null;
  // for (const entry of entries) {
  //   if (!phonetic && entry.phonetic) phonetic = entry.phonetic;

  //   for (const p of entry.phonetics ?? []) {
  //     if (!phonetic && p.text) phonetic = p.text;
  //     if (!audio && p.audio) audio = p.audio;
  //   }

  //   for (const meaning of entry.meanings ?? []) {
  //     const definitions = (meaning.definitions ?? [])
  //       .filter((d) => d?.definition)
  //       .slice(0, 5)
  //       .map((d) => ({
  //         definition: d.definition,
  //         example: d.example ?? null,
  //       }));

  //     if (definitions.length === 0) continue;

  //     meanings.push({
  //       partOfSpeech: meaning.partOfSpeech ?? "unknown",
  //       definitions,
  //       synonyms: (meaning.synonyms ?? []).slice(0, 8),
  //     });
  //   }
  // }

  // if (meanings.length === 0) {
  //   throw new LookupError("not_found", `No usable entry for “${fallbackWord}”`);
  // }

  // return {
  //   word: entries[0]?.word ?? fallbackWord,
  //   phonetic,
  //   audio,
  //   source: "dictionaryapi.dev",
  //   meanings,
  // };

// }


function normalizeDictionaryApi(payload, fallbackWord) {
  if (!payload?.exists || !payload.results?.length) {
    return null;
  }

  const entry =
    payload.results.find((item) => item.lang_code === "en") ??
    payload.results[0];

  const normalizeText = (value) =>
    typeof value === "string"
      ? value.normalize("NFC").trim()
      : "";

  const posMap = {
    "danh từ": "noun",
    "động từ": "verb",
    "tính từ": "adjective",
    "trạng từ": "adverb",
    "thán từ": "interjection",
    "giới từ": "preposition",
    "đại từ": "pronoun",
    "liên từ": "conjunction",
    "mạo từ": "article",
    "từ hạn định": "determiner",
    "trợ động từ": "auxiliary verb",
    "số từ": "numeral",
    "từ cảm thán": "interjection",
  };

  const normalizePos = (pos) => {
    const value = normalizeText(pos).toLowerCase();
    return posMap[value] ?? (value || "unknown");
  };

  const meaningsMap = new Map();

  for (const item of entry.meanings ?? []) {
    const partOfSpeech = normalizePos(item.pos);

    if (!meaningsMap.has(partOfSpeech)) {
      meaningsMap.set(partOfSpeech, {
        partOfSpeech,
        definitions: [],
        synonyms: [],
      });
    }

    const group = meaningsMap.get(partOfSpeech);
    const definition = normalizeText(item.definition);
    const example = item.example
      ? normalizeText(item.example)
      : null;

    const exists = group.definitions.some(
      (d) =>
        d.definition === definition &&
        d.example === example
    );

    if (definition && !exists) {
      group.definitions.push({ definition, example });
    }
  }

  const synonyms = [
    ...new Set(
      (entry.relations ?? [])
        .filter(
          (item) =>
            normalizeText(item.relation_type).toLowerCase() ===
            "đồng nghĩa"
        )
        .map((item) => normalizeText(item.related_word))
        .filter(Boolean)
    ),
  ];

  // API không phân loại synonym theo POS.
  for (const group of meaningsMap.values()) {
    group.synonyms = [...synonyms];
  }

  const rawAudio = normalizeText(entry.audio);
  let audio = null;

  if (rawAudio) {
    try {
      audio = new URL(rawAudio, "https://dict.minhqnd.com/" || undefined).href;
    } catch {
      audio = rawAudio;
    }
  }

  const sources = [
    ...new Set(
      (entry.meanings ?? [])
        .map((item) => normalizeText(item.source))
        .filter(Boolean)
    ),
  ];

  return {
    word: normalizeText(payload.word).toLowerCase(),
    phonetic:
      normalizeText(entry.pronunciations?.[0]?.ipa) || null,
    audio,
    source: sources.join(", ") || "unknown",
    meanings: [...meaningsMap.values()],
  };
}


let active = null;

/**
 * Đặt adapter đang dùng. Gọi một lần lúc khởi động, hoặc trong test
 * để thay bằng adapter giả.
 */
export function setLookupAdapter(adapter) {
  active = adapter;
}

export function getLookupAdapter() {
  return (active ??= createDictionaryApiAdapter());
}

/** Tra một từ bằng adapter đang hoạt động. */
export function lookupWord(word, options) {
  return getLookupAdapter().lookup(word, options);
}
