# mesh-tide-pool

[![Live](https://img.shields.io/badge/live-baditaflorin.github.io%2Fmesh--tide--pool-4AB3FF?style=flat-square)](https://baditaflorin.github.io/mesh-tide-pool/)
[![Version](https://img.shields.io/github/package-json/v/baditaflorin/mesh-tide-pool?style=flat-square&color=4AB3FF)](https://github.com/baditaflorin/mesh-tide-pool/blob/main/package.json)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![No backend](https://img.shields.io/badge/backend-none-051018?style=flat-square)](docs/adr/0001-deployment-mode.md)

> Each phone is a drop in a shared 2D wave pool. Tilt to move; interference patterns are drawn live on every phone at once.

**Live:** https://baditaflorin.github.io/mesh-tide-pool/

Open the link on every phone in your group. Tap **Allow tilt and connect**.
Every phone becomes a drop in the same shared pool — your drop moves with
the tilt of your phone, and every phone renders the same wave interference
field, summed from all live drops. Watchable forever.

Toggle **river mode** to add a flow bias toward the center of the canvas:
the whole field drains gently to a single focal point. The same drops, the
same data, two different visual registers.

## How it works

1. Each phone joins a shared **Yjs document** over **y-webrtc** via a
   self-hosted signaling server.
2. Every 200 ms, each peer publishes `{x, y, hue, ts}` into Yjs awareness.
3. At 30 fps, each phone renders an 80×80 grid where every cell sums sines
   over all live peers: `sin(2π · (distance · FREQUENCY − meshNow · SPEED)) · falloff`.
4. The grid is upscaled to fullscreen via `image-rendering: pixelated` — the
   chunky aesthetic is intentional.
5. In river mode, an extra `dot(direction-to-center, mean-peer-vector)`
   term adds a directional drain.

## Privacy threat model

See [docs/privacy.md](docs/privacy.md). Each peer in the room sees only your
drop's `(x, y, hue)` and a timestamp — nothing else.

## Architecture

- **Mode A** — pure GitHub Pages. ([ADR 0001](docs/adr/0001-deployment-mode.md))
- **WebRTC** — Yjs + y-webrtc with self-hosted signaling and TURN.
- **Render** — Canvas 2D, 80×80 grid upscaled with `image-rendering: pixelated`. No WebGL.

## Run it locally

```bash
git clone https://github.com/baditaflorin/mesh-tide-pool.git
cd mesh-tide-pool
npm install
npm run dev
```

## Self-hosted infrastructure

| Repo                                                                   | Endpoint                               | Role                      |
| ---------------------------------------------------------------------- | -------------------------------------- | ------------------------- |
| [signaling-server](https://github.com/baditaflorin/signaling-server)   | `wss://turn.0docker.com/ws`            | y-webrtc protocol fan-out |
| [turn-token-server](https://github.com/baditaflorin/turn-token-server) | `https://turn.0docker.com/credentials` | HMAC TURN creds           |
| [coturn-hetzner](https://github.com/baditaflorin/coturn-hetzner)       | `turn:turn.0docker.com:3479`           | TURN relay                |

## Settings (in-app)

- **Room ID** — phones must share one to see each other.
- **Hue** — 0–359°, your drop's color.
- **Mode** — Free pool / River → sink.
- **Wave intensity** — 0.2–2.5, scales the sum-of-sines amplitude before clamping.
- **Signaling URL** / **TURN credentials URL** — override defaults.

## ADRs

- [0001 — Deployment mode](docs/adr/0001-deployment-mode.md)
- [0002 — Sum-of-sines vs propagating ripples](docs/adr/0002-sum-of-sines.md)
- [0003 — Free vs river modes](docs/adr/0003-free-vs-river-modes.md)
- [0010 — GitHub Pages publishing](docs/adr/0010-pages-publishing.md)

## License

[MIT](LICENSE) © 2026 Florin Badita
