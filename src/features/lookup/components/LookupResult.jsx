import { useLookup } from "@/features/lookup/useLookup";

/** Khối kết quả tra từ: phiên âm, audio, nghĩa, ví dụ, đồng nghĩa. */
export default function LookupResult() {
  const { result, error, loading, toggleFavorite, isFavorite } = useLookup();

  if (loading) {
    return (
      <div className="lookup-state">
        <span className="spinner" aria-hidden="true" />
        <span className="hint">Searching…</span>
      </div>
    );
  }

  if (error) {
    const hint =
      error.code === "not_found" || error.code === "unavailable"
        ? null
        : "Check your connection or the lookup endpoint.";

    return (
      <div className="lookup-state lookup-state-error">
        <p className="hint">
          {error.code === "not_found" || error.code === "unavailable"
            ? error.message
            : `Lookup failed: ${error.message}`}
        </p>
        {hint && <p className="hint">{hint}</p>}
      </div>
    );
  }

  if (!result) {
    return (
      <div className="lookup-state">
        <p className="hint">
          Type a word and press Enter to see its meaning, pronunciation and
          examples.
        </p>
      </div>
    );
  }

  const favorite = isFavorite(result.word);

  return (
    <article className="lookup-card">
      <header className="lookup-head">
        <div className="lookup-title">
          <h2>{result.word}</h2>
          {result.phonetic && <span className="phonetic">{result.phonetic}</span>}
        </div>

        <div className="lookup-head-actions">
          {result.audio && (
            <audio className="lookup-audio" controls src={result.audio} />
          )}
          <button
            type="button"
            className={`btn-text${favorite ? " is-active" : ""}`}
            onClick={() => toggleFavorite()}
            aria-pressed={favorite}
          >
            {favorite ? "★ Saved" : "☆ Save"}
          </button>
        </div>
      </header>

      {result.meanings.map((meaning, index) => (
        <section className="meaning" key={`${meaning.partOfSpeech}-${index}`}>
          <h3 className="part-of-speech">{meaning.partOfSpeech}</h3>

          <ol className="definitions">
            {meaning.definitions.map((definition, i) => (
              <li key={i}>
                <p>{definition.definition}</p>
                {definition.example && (
                  <p className="example">“{definition.example}”</p>
                )}
              </li>
            ))}
          </ol>

          {meaning.synonyms.length > 0 && (
            <div className="synonyms">
              <span className="synonyms-label">Synonyms</span>
              <div className="chips">
                {meaning.synonyms.map((synonym) => (
                  <span className="chip" key={synonym}>
                    {synonym}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      ))}

      <footer className="lookup-foot hint">Source: {result.source}</footer>
    </article>
  );
}
