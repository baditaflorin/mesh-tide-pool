import { useEffect, useMemo, useRef, useState } from "react";
import { useTilt } from "@baditaflorin/mesh-common";
import { createRoomSync } from "../sync/yjsRoom";
import { createClockSync } from "../sync/clockSync";
import { maybeFetchTurnCredentials } from "../sync/iceConfig";

type Awareness = {
  clientID: number;
  setLocalStateField: (key: string, value: unknown) => void;
  getStates: () => Map<number, Record<string, unknown>>;
  on: (event: string, cb: () => void) => void;
  off: (event: string, cb: () => void) => void;
};

export type Mode = "free" | "river";

type Drop = { x: number; y: number; hue: number; ts: number };

type Props = {
  roomId: string;
  hue: number;
  mode: Mode;
  intensity: number;
};

const GRID = 80;
const FRAME_INTERVAL_MS = 1000 / 30;
const WAVE_SPEED = 0.0006; // phase advance per ms
const FREQUENCY = 14; // cycles per virtual-pool diagonal

export function TidePool({ roomId, hue, mode, intensity }: Props) {
  const [armed, setArmed] = useState(false);
  const tilt = useTilt({ armed });
  const motionGranted = tilt.ready;
  const permissionError = tilt.error;
  const [peers, setPeers] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const myPosRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const dropsRef = useRef<Drop[]>([]);

  const mesh = useMemo(() => {
    if (!armed) return null;
    const room = createRoomSync(roomId);
    const clock = createClockSync(room.provider);
    return { room, clock };
  }, [armed, roomId]);

  useEffect(() => {
    if (!armed) return;
    void maybeFetchTurnCredentials();
  }, [armed]);

  useEffect(() => {
    return () => {
      mesh?.clock.destroy();
      mesh?.room.provider?.destroy();
    };
  }, [mesh]);

  // DeviceOrientation -> myPos. Default to center if not granted.
  useEffect(() => {
    if (!armed || !motionGranted) return;
    const gamma = tilt.gamma ?? 0; // -90..90 left/right
    const beta = tilt.beta ?? 0; // -180..180 front/back
    const x = clamp01(0.5 + gamma / 60);
    const y = clamp01(0.5 + (beta - 30) / 60);
    myPosRef.current = { x, y };
  }, [armed, motionGranted, tilt.gamma, tilt.beta]);

  // Touch fallback: drag finger to move "drop"
  useEffect(() => {
    if (!armed) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const onMove = (e: PointerEvent) => {
      if (motionGranted) return; // tilt is authoritative when active
      const rect = canvas.getBoundingClientRect();
      myPosRef.current = {
        x: clamp01((e.clientX - rect.left) / rect.width),
        y: clamp01((e.clientY - rect.top) / rect.height),
      };
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onMove);
    return () => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onMove);
    };
  }, [armed, motionGranted]);

  // Publish my drop awareness, read others
  useEffect(() => {
    if (!mesh?.room.provider) return undefined;
    const awareness = (mesh.room.provider as unknown as { awareness: Awareness }).awareness;

    const publish = () => {
      const p = myPosRef.current;
      awareness.setLocalStateField("drop", {
        x: p.x,
        y: p.y,
        hue,
        ts: Date.now(),
      });
    };

    const refreshDrops = () => {
      const fresh = Date.now() - 6000;
      const next: Drop[] = [];
      const states = awareness.getStates();
      states.forEach((state) => {
        const d = state["drop"] as Drop | undefined;
        if (!d) return;
        if ((d.ts ?? 0) < fresh) return;
        next.push(d);
      });
      dropsRef.current = next;
      setPeers(Math.max(0, next.length - 1));
    };

    publish();
    refreshDrops();
    const pub = setInterval(publish, 200);
    awareness.on("change", refreshDrops);
    return () => {
      clearInterval(pub);
      awareness.off("change", refreshDrops);
    };
  }, [mesh, hue]);

  // Render loop (30 fps), downsampled grid scaled with image-rendering:pixelated
  useEffect(() => {
    if (!mesh) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    canvas.width = GRID;
    canvas.height = GRID;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    const img = ctx.createImageData(GRID, GRID);

    let raf = 0;
    let last = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < FRAME_INTERVAL_MS) return;
      last = now;

      const t = mesh.clock.meshNow();
      const drops = dropsRef.current;
      const dropCount = drops.length;
      if (dropCount === 0) {
        ctx.fillStyle = "#080816";
        ctx.fillRect(0, 0, GRID, GRID);
        return;
      }

      // Pre-compute avg hue
      let hueSumX = 0;
      let hueSumY = 0;
      for (const d of drops) {
        const r = ((d.hue % 360) + 360) % 360;
        const a = (r * Math.PI) / 180;
        hueSumX += Math.cos(a);
        hueSumY += Math.sin(a);
      }
      const avgHue = (Math.atan2(hueSumY, hueSumX) * 180) / Math.PI;
      const meanHue = (avgHue + 360) % 360;

      const data = img.data;
      const cx = 0.5;
      const cy = 0.5;
      const phase = t * WAVE_SPEED;

      for (let gy = 0; gy < GRID; gy++) {
        const yn = gy / (GRID - 1);
        for (let gx = 0; gx < GRID; gx++) {
          const xn = gx / (GRID - 1);
          let acc = 0;
          for (let i = 0; i < dropCount; i++) {
            const d = drops[i]!;
            const dx = xn - d.x;
            const dy = yn - d.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const falloff = 1 / (1 + 6 * dist * dist);
            acc += Math.sin((dist * FREQUENCY - phase) * Math.PI * 2) * falloff;
          }
          if (mode === "river") {
            // Flow bias toward center: pixels closer to center get a positive
            // boost proportional to dot(direction-to-center, mean-drop-vector).
            const tx = cx - xn;
            const ty = cy - yn;
            const tlen = Math.sqrt(tx * tx + ty * ty) || 1;
            const tdx = tx / tlen;
            const tdy = ty / tlen;
            let meanVx = 0;
            let meanVy = 0;
            for (let i = 0; i < dropCount; i++) {
              const d = drops[i]!;
              meanVx += d.x - cx;
              meanVy += d.y - cy;
            }
            meanVx /= dropCount;
            meanVy /= dropCount;
            const flow = tdx * meanVx + tdy * meanVy;
            acc += flow * 2.0;
          }

          // Normalize roughly: typical |acc| grows with dropCount; clamp.
          const norm = Math.max(-1, Math.min(1, (acc / Math.max(1, dropCount * 0.6)) * intensity));
          const light = 12 + 44 * (0.5 + 0.5 * norm);
          const sat = 75;
          const [r, g, b] = hslToRgb(meanHue / 360, sat / 100, light / 100);
          const idx = (gy * GRID + gx) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);

      // Overlay: my dot in CSS layer (handled via the marker element)
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [mesh, mode, intensity]);

  if (!armed) {
    return (
      <div className="tide-arm">
        <h1>mesh-tide-pool</h1>
        <p>
          Each phone is a drop in a shared 2D pool. Tilt your phone (or drag a finger) to move your
          drop; every phone renders the same wave interference pattern from all drops at once.
        </p>
        <button type="button" className="tide-arm-button" onClick={() => setArmed(true)}>
          Allow tilt and connect
        </button>
        {permissionError && <p className="tide-error">{permissionError}</p>}
        <p className="tide-hint">
          Mode: <code>{mode}</code> · hue {hue}°
        </p>
      </div>
    );
  }

  const myDot = myPosRef.current;
  return (
    <div className="tide-stage">
      <canvas ref={canvasRef} className="tide-canvas" />
      <div
        className="tide-mydot"
        style={{
          left: `${myDot.x * 100}%`,
          top: `${myDot.y * 100}%`,
          background: `hsl(${hue}, 90%, 65%)`,
        }}
      />
      <div className="tide-hud">
        <span>
          {peers + 1} drop{peers + 1 === 1 ? "" : "s"}
        </span>
        <span aria-hidden="true">·</span>
        <span>{mode} mode</span>
      </div>
      {permissionError && <p className="tide-error tide-error-overlay">{permissionError}</p>}
    </div>
  );
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}
function hue2rgb(p: number, q: number, t: number): number {
  let x = t;
  if (x < 0) x += 1;
  if (x > 1) x -= 1;
  if (x < 1 / 6) return p + (q - p) * 6 * x;
  if (x < 1 / 2) return q;
  if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
  return p;
}
