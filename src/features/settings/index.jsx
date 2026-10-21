import { SETTINGS_SCHEMA } from "@/core/settings/schema";
import { useSettings } from "@/core/settings/useSettings";

/** Một hàng setting, render theo `spec.type` từ schema. */
function SettingRow({ group, name, spec, value, onChange }) {
  const id = `set-${group}-${name}`;

  if (spec.type === "boolean") {
    return (
      <label className="switch" htmlFor={id} title={spec.description}>
        <input
          id={id}
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(group, name, e.target.checked)}
        />
        <span>
          {spec.label}
          {spec.description ? ` — ${spec.description}` : ""}
        </span>
      </label>
    );
  }

  if (spec.type === "number") {
    return (
      <div className="field">
        <label htmlFor={id} title={spec.description}>
          {spec.label} — {value}
          {spec.unit ?? ""}
        </label>
        <input
          id={id}
          type="range"
          min={spec.min}
          max={spec.max}
          step={spec.step ?? 1}
          value={value}
          onChange={(e) => onChange(group, name, Number(e.target.value))}
        />
      </div>
    );
  }

  if (spec.type === "enum") {
    return (
      <div className="field">
        <label htmlFor={id} title={spec.description}>
          {spec.label}
        </label>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(group, name, e.target.value)}
        >
          {spec.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Kiểu chưa hỗ trợ — hiển thị để không im lặng bỏ qua
  return (
    <p className="hint hint-info">
      Unsupported setting type “{spec.type}” for {group}.{name}
    </p>
  );
}

export default function SettingsPanel() {
  const { settings, loaded, updateSetting, resetSettings } = useSettings();

  return (
    <>
      {Object.entries(SETTINGS_SCHEMA)
        .map(([group, groupDef]) => [
          group,
          groupDef,
          Object.entries(groupDef.settings).filter(([, spec]) => !spec.hidden),
        ])
        .filter(([, , visible]) => visible.length > 0)
        .map(([group, groupDef, visible]) => (
          <section className="settings-group" key={group}>
            <h2>{groupDef.label}</h2>
            {groupDef.description && <p className="hint">{groupDef.description}</p>}

            {visible.map(([name, spec]) => (
              <SettingRow
                key={name}
                group={group}
                name={name}
                spec={spec}
                value={settings[group][name]}
                onChange={updateSetting}
              />
            ))}
          </section>
        ))}

      <div className="actions">
        <button type="button" onClick={resetSettings}>
          Reset to defaults
        </button>
        <span className="hint">
          {!loaded
            ? "Loading saved settings…"
            : "Changes are saved automatically."}
        </span>
      </div>
    </>
  );
}
