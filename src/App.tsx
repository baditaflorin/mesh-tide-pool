import { useEffect, useState } from "react";
import { MeshShell } from "@baditaflorin/mesh-common";
import { TidePool, type Mode } from "./features/tide/TidePool";
import { SettingsExtras } from "./features/settings/SettingsExtras";
import { appConfig } from "./shared/config";

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
    <MeshShell
      config={appConfig}
      roomId={roomId}
      onRoomChange={setRoomId}
      settingsExtras={
        <SettingsExtras
          hue={hue}
          onHueChange={setHue}
          mode={mode}
          onModeChange={setMode}
          intensity={intensity}
          onIntensityChange={setIntensity}
        />
      }
    >
      <TidePool roomId={roomId} hue={hue} mode={mode} intensity={intensity} />
    </MeshShell>
  );
}
