# English Toolkit

Chrome MV3 **side-panel extension** for English learning: realtime transcription (local Whisper backend), translation, rewriting, and settings.

Built with React 19 + Vite 8, linted with oxlint. Import alias: `@` → `src`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Browser dev server (settings fall back to `localStorage`) |
| `npm run dev:ext` | `vite build --watch` — load `dist/` as an unpacked extension in `chrome://extensions` |
| `npm run build` | Production build into `dist/` |
| `npm run lint` | oxlint |
| `npm test` | jsdom tests: render mọi tab, settings schema, context menu, lookup |

Extension dev loop: run `npm run dev:ext`, load `dist/` unpacked, click "reload" after rebuilds. Open the panel with **Ctrl+Shift+E**; switch tabs with **Ctrl+←/→**.

## Architecture

```
src/
├── main.jsx                # entry: mounts app/App.jsx
├── app/                    # composition root (may import features + core)
│   ├── App.jsx             # provider tree: SettingsProvider > TabProvider > shell
│   ├── tabs.js             # tab registry (icons + content components) — app-level, not constants
│   └── layout/             # SideBar, Panel, ContextMenu (app chrome)
├── config/                 # pure data only: env (WS_URL, APP_VERSION, isChromeExtension)
├── core/                   # app-wide infrastructure, never imports app/ or features/
│   ├── components/         # Icons (shared UI)
│   ├── hooks/              # useTab, useShortcuts
│   ├── providers/          # TabProvider + contexts.js (createContext only)
│   ├── settings/           # settings module: schema · storage · SettingsProvider · useSettings
│   └── utils/              # debounce
├── features/               # one folder = one side-panel tab
│   ├── home/ translate/ rewrite/ account/ settings/
│   ├── live/               # realtime transcription UI + useLiveTranscript + WS service
│   ├── lookup/             # dictionary lookup: provider + services/ (adapter, storage)
│   └── favorites/          # saved words — reads the same LookupProvider state as lookup/
├── services/audio/         # AudioCaptureService, PCM worklet, resample (shared infra)
├── styles/                 # variables, global, components, responsive CSS
└── assets/                 # Roboto variable fonts, icons
public/                     # manifest.json, background.js (MV3 service worker)
playground/                 # manual HTML/CSS/JS prototypes (not automated tests)
```

Layering rules:

- `features/` imports only hooks (`useTab`, `useSettings`, …) — never context objects directly.
- `core/` never imports from `app/` or `features/`; `TabProvider` receives the tab registry via the `tabs` prop.
- Adding a tab: create `src/features/<name>/index.jsx`, register it in `src/app/tabs.js`.
- Touching settings: everything lives in `src/core/settings/` (schema, storage, provider, hook); the panel UI is `src/features/settings/`.
- Two tabs sharing state (e.g. Lookup + Favorites): put the provider in `features/<name>/` and wrap it once in `app/App.jsx`, above `TabProvider`. Context object goes in its own file so fast refresh stays happy.

## Realtime transcription

The Live tab captures tab/system audio or microphone (`AudioCaptureService` → PCM Float32 mono 16 kHz via AudioWorklet) and streams it over WebSocket to a local backend:

- URL: `ws://127.0.0.1:8765` by default, override with `VITE_WS_URL` (e.g. `VITE_WS_URL=ws://localhost:9000 npm run build`)
- Messages: client sends raw PCM buffers plus `{"type":"config","language":"en"|"vi"}`; server replies with JSON `{type: "status" | "transcript" | "error", ...}`

## Settings

Settings are defined by a schema in `src/core/settings/schema.js` — the single source of truth for defaults, types, allowed values, and UI labels. Everything else derives from it:

- `buildDefaults()` → default settings object (used by the provider and storage).
- `coerceSetting(spec, value)` → normalizes a value or returns `undefined` when invalid (enum membership, numeric range, boolean strings).
- `sanitizeSettings(raw)` → cleans anything read from storage: drops unknown groups/keys, replaces wrong-typed values with defaults. Corrupt JSON can't break the app.
- `listSettings()` / `getSettingSpec(group, key)` → introspection helpers.

`updateSetting()` validates against the schema before writing, so an invalid value is rejected instead of persisted. Adding a setting means adding one entry to the schema — the Settings panel renders rows from it automatically (enum → `<select>`, number → range slider with min/max/step/unit, boolean → switch).

Persisted via `chrome.storage.local` inside the extension (requires the `storage` permission) or `localStorage` in a plain browser.

## Lookup

The Lookup tab looks a word up and shows phonetics, pronunciation audio, meanings grouped by part of speech, examples, and synonyms. Recent lookups become clickable chips; `☆ Save` keeps a word in the Favorites tab. History and favorites are persisted separately from settings (key `lookup-data`).

The data source sits behind a swappable adapter in `src/features/lookup/services/lookupService.js`:

```js
setLookupAdapter({ name: "my-backend", lookup: (word, { signal }) => Promise<LookupResult> });
```

The default adapter calls [dictionaryapi.dev](https://dictionaryapi.dev) — free, no key needed. Override the endpoint with `VITE_LOOKUP_URL` (or pass `baseUrl` to `createDictionaryApiAdapter`) to point at your own backend.

Adapters either resolve a `LookupResult` (`{ word, phonetic, audio, source, meanings[] }`) or throw `LookupError` with a `code` of `not_found` (404), `unavailable` (5xx — service down, not the user's connection), `network`, `invalid`, or `unknown`. The UI shows a different message per code, and in-flight requests are aborted when a new lookup starts or the provider unmounts.
