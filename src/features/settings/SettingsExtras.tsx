import type { Mode } from "../tide/TidePool";

type Props = {
  hue: number;
  onHueChange: (next: number) => void;
  mode: Mode;
  onModeChange: (next: Mode) => void;
  intensity: number;
  onIntensityChange: (next: number) => void;
};

export function SettingsExtras({
  hue,
  onHueChange,
  mode,
  onModeChange,
  intensity,
  onIntensityChange,
}: Props) {
  return (
    <>
      <label>
        <span>Your hue ({hue}°)</span>
        <input
          type="range"
          min={0}
          max={359}
          value={hue}
          onChange={(e) => onHueChange(Number(e.target.value))}
        />
      </label>

      <label>
        <span>Mode</span>
        <div className="settings-toggle">
          <button
            type="button"
            className={mode === "free" ? "on" : ""}
            onClick={() => onModeChange("free")}
          >
            Free pool
          </button>
          <button
            type="button"
            className={mode === "river" ? "on" : ""}
            onClick={() => onModeChange("river")}
          >
            River → sink
          </button>
        </div>
      </label>

      <label>
        <span>Wave intensity ({intensity.toFixed(2)})</span>
        <input
          type="range"
          min={0.2}
          max={2.5}
          step={0.05}
          value={intensity}
          onChange={(e) => onIntensityChange(Number(e.target.value))}
        />
      </label>
    </>
  );
}
