import LookupResult from "./components/LookupResult";
import { useLookup } from "./useLookup";

export default function LookupPanel() {
  const {
    query,
    setQuery,
    search,
    loading,
    history,
    searchTerm,
    clearHistory,
    clear,
  } = useLookup();

  function onSubmit(e) {
    e.preventDefault();
    search();
  }

  return (
    <>
      <form className="lookup-bar" onSubmit={onSubmit} role="search">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Look up a word…"
          aria-label="Word to look up"
          autoComplete="off"
          spellCheck="false"
        />
        <button type="submit" disabled={loading || !query.trim()}>
          {loading ? "…" : "Look up"}
        </button>
        {query && (
          <button type="button" className="btn-text" onClick={clear}>
            Clear
          </button>
        )}
      </form>

      <div className="lookup-body">
        <LookupResult />

        {history.length > 0 && (
          <section className="lookup-history">
            <div className="box-head">
              <span>Recent</span>
              <button type="button" className="btn-text" onClick={clearHistory}>
                Clear history
              </button>
            </div>
            <div className="chips">
              {history.map((item) => (
                <button
                  type="button"
                  className="chip chip-button"
                  key={item.word}
                  onClick={() => searchTerm(item.word)}
                  title={item.phonetic ?? item.word}
                >
                  {item.word}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
