import { useEffect, useState } from "react";
import { TidePool, type Mode } from "./features/tide/TidePool";
import { SettingsDrawer } from "./features/settings/SettingsDrawer";
import { appConfig } from "./shared/config";
import { InviteShareButton } from "@baditaflorin/mesh-common";

const STORAGE = {
  room: `${appConfig.storagePrefix}:room`,
  hue: `${appConfig.storagePrefix}:hue`,
  mode: `${appConfig.storagePrefix}:mode`,
  intensity: `${appConfig.storagePrefix}:intensity`,
};

function readString(key: string, fallback: string): string {
  return localStorage.getItem(key) ?? fallback;
}
function readNumber(key: string, fallback: number): number {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}
function readMode(key: string, fallback: Mode): Mode {
  const raw = localStorage.getItem(key);
  if (raw === "free" || raw === "river") return raw;
  return fallback;
}

export function App() {
  const [roomId, setRoomId] = useState(() => readString(STORAGE.room, "default"));
  const [hue, setHue] = useState(() => readNumber(STORAGE.hue, 200));
  const [mode, setMode] = useState<Mode>(() => readMode(STORAGE.mode, "free"));
  const [intensity, setIntensity] = useState(() => readNumber(STORAGE.intensity, 1));
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE.room, roomId);
  }, [roomId]);
  useEffect(() => {
    localStorage.setItem(STORAGE.hue, String(hue));
  }, [hue]);
  useEffect(() => {
    localStorage.setItem(STORAGE.mode, mode);
  }, [mode]);
  useEffect(() => {
    localStorage.setItem(STORAGE.intensity, String(intensity));
  }, [intensity]);

  return (
    <div className="app-root">
      <TidePool roomId={roomId} hue={hue} mode={mode} intensity={intensity} />

      <InviteShareButton appName={appConfig.appName} roomId={roomId} />
      <button
        type="button"
        className="settings-fab"
        onClick={() => setSettingsOpen(true)}
        aria-label="Open settings"
      >
        ⚙
      </button>

      <div className="self-ref">
        <a href={appConfig.repositoryUrl} target="_blank" rel="noreferrer">
          source
        </a>
        <span aria-hidden="true">·</span>
        <a href={appConfig.paypalUrl} target="_blank" rel="noreferrer">
          tip ♥
        </a>
        <span aria-hidden="true">·</span>
        <span>
          v{appConfig.version} · {appConfig.commit}
        </span>
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        roomId={roomId}
        onRoomChange={setRoomId}
        hue={hue}
        onHueChange={setHue}
        mode={mode}
        onModeChange={setMode}
        intensity={intensity}
        onIntensityChange={setIntensity}
      />
    </div>
  );
}
