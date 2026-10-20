import { useLookup } from "@/features/lookup/useLookup";

/** Danh sách từ đã lưu, mở ở tab riêng. */
export default function FavoritesPanel() {
  const { favorites, searchTerm, toggleFavorite, loaded, clear } = useLookup();

  if (!loaded) {
    return <p className="hint">Loading saved words…</p>;
  }

  if (favorites.length === 0) {
    return (
      <div className="lookup-state">
        <p className="hint">
          No saved words yet. Look a word up and press “☆ Save” to keep it here.
        </p>
      </div>
    );
  }

  return (
    <ul className="favorite-list">
      {favorites.map((item) => (
        <li className="favorite-item" key={item.word}>
          <button
            type="button"
            className="favorite-word"
            onClick={() => {
              clear();
              searchTerm(item.word);
            }}
          >
            <span className="favorite-term">{item.word}</span>
            {item.phonetic && <span className="phonetic">{item.phonetic}</span>}
          </button>

          <button
            type="button"
            className="btn-text"
            onClick={() => toggleFavorite(item)}
            aria-label={`Remove ${item.word} from favorites`}
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
