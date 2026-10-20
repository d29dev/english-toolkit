import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LookupError, lookupWord } from "./services/lookupService";
import { lookupStorage } from "./services/lookupStorage";
import { LookupContext } from "./lookupContext";

export function LookupProvider({ children }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ history: [], favorites: [] });
  const [loaded, setLoaded] = useState(false);

  // Huỷ request cũ khi tra từ mới
  const abortRef = useRef(null);

  useEffect(() => {
    let active = true;

    lookupStorage
      .get()
      .then((saved) => {
        if (active) setData(saved);
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

  const persist = useCallback(async (next) => {
    setData(next);
    try {
      await lookupStorage.set(next);
    } catch (error) {
      console.error("Cannot save lookup data:", error);
    }
  }, []);

  const search = useCallback(
    async (raw) => {
      const term = (raw ?? query).trim();
      if (!term) {
        setError(new LookupError("invalid", "Type a word to look up"));
        setResult(null);
        return null;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const found = await lookupWord(term, { signal: controller.signal });
        setResult(found);

        await persist(
          lookupStorage.pushHistory(data, {
            word: found.word,
            phonetic: found.phonetic,
            at: Date.now(),
          }),
        );

        return found;
      } catch (err) {
        if (err?.name === "AbortError") return null;

        setResult(null);
        setError(
          err instanceof LookupError
            ? err
            : new LookupError("unknown", err?.message ?? "Lookup failed"),
        );
        return null;
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setLoading(false);
        }
      }
    },
    [query, data, persist],
  );

  /** Tra lại một mục từ lịch sử/yêu thích. */
  const searchTerm = useCallback(
    (word) => {
      setQuery(word);
      return search(word);
    },
    [search],
  );

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setQuery("");
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  const toggleFavorite = useCallback(
    (item) => {
      const entry = item ?? {
        word: result?.word,
        phonetic: result?.phonetic ?? null,
        at: Date.now(),
      };

      if (!entry.word) return;
      persist(lookupStorage.toggleFavorite(data, entry));
    },
    [data, persist, result],
  );

  const isFavorite = useCallback(
    (word) => data.favorites.some((item) => item.word === word),
    [data.favorites],
  );

  const clearHistory = useCallback(
    () => persist({ ...data, history: [] }),
    [data, persist],
  );

  const value = useMemo(
    () => ({
      query,
      setQuery,
      result,
      error,
      loading,
      history: data.history,
      favorites: data.favorites,
      loaded,
      search,
      searchTerm,
      clear,
      toggleFavorite,
      isFavorite,
      clearHistory,
    }),
    [
      query,
      result,
      error,
      loading,
      data,
      loaded,
      search,
      searchTerm,
      clear,
      toggleFavorite,
      isFavorite,
      clearHistory,
    ],
  );

  return <LookupContext.Provider value={value}>{children}</LookupContext.Provider>;
}
