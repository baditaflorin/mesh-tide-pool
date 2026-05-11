---
status: accepted
date: 2026-05-12
---

# 0002 — Sum-of-sines vs propagating ripples

## Context

`mesh-tide-pool` and `mesh-wave-canvas` share the "phones rendering a shared 2D
canvas" pattern, but they differ on what the canvas is showing. The wave-canvas
app draws discrete tap-emitted ripples that propagate outward and decay over a
fixed lifetime — event-driven. Here we want an **ambient** experience: each
peer is always emitting waves, and the interference pattern is the picture.

## Decision

Use a **continuous sum-of-sines** field. Each frame, for each pixel in a
downsampled grid, compute

```
intensity(x, y, t) = Σ_peers  sin(2π · (dist(peer, pixel) · FREQUENCY − t · WAVE_SPEED)) · falloff(dist)
```

where `falloff(d) = 1 / (1 + 6 d²)` and `t` is `meshNow()`. Hue is the
circular-mean of peer hues; lightness is mapped from the normalized intensity.

In river mode, an additional flow term biases the field toward the center:

```
intensity += dot(direction_to_center, mean_peer_position − center) · 2
```

## Consequences

- **Pros.** No event-driven state on the wire; only peer positions. Always
  alive — even a single drop produces a slow radial breathing. Adding peers
  smoothly increases visual complexity. Re-joining is instant (no history to
  rebuild).
- **Cons.** O(peers × pixels) per frame. With pixels = 80² and peers = 10 that
  is 64 000 sines per frame. We mitigate with:
  1. Downsampled 80×80 grid scaled to fullscreen via
     `image-rendering: pixelated` (looks intentionally crunchy).
  2. 30 fps target (one frame every 33 ms) with `requestAnimationFrame`
     throttling.
  3. JS-side `Math.sin` is fast enough at this scale; no shader needed.
- **Trade-off.** The look is "voxel watercolor" rather than "smooth glass."
  That fits the ambient-art use case better than crisp lines would.

## Alternatives considered

- **Propagating ripples like `mesh-wave-canvas`.** Rejected — would need an
  emission cadence (when does each peer emit?) and ripples would have to die
  off, defeating the always-emitting feel.
- **WebGL fragment shader.** Could move the field to the GPU at full
  resolution. Rejected for v1: 80×80 in JS runs cold on a 5-year-old phone
  and the chunky aesthetic is on-purpose. Worth revisiting if peer counts
  routinely exceed 20.
- **Per-peer cached field, sum at the end.** Constant work per pixel
  regardless of peer count, but the cached fields would need invalidation
  every time any peer moves — for tilt-driven positions this is every frame,
  so no win.
