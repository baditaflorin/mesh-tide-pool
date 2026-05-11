---
status: accepted
date: 2026-05-12
---

# 0003 — Free vs river modes

## Context

The base "drops in a pool" mechanic — radially symmetric interference from
each peer — is beautiful but undirected. For ritual or team-building use
("we are a group flowing together"), the room benefits from a focal point
where the collective signal visibly converges.

## Decision

Offer two modes, toggleable from the Settings drawer:

- **Free pool** — pure sum-of-sines from peer positions; radially symmetric
  per drop. The original experience.
- **River → sink** — adds a directional bias toward the canvas center. Each
  pixel's intensity gets an extra term proportional to
  `dot(direction_to_center, mean_peer_displacement)`. When all peers cluster
  on one side, the field bulges toward the opposite side of the room as if
  pulled downhill toward the center.

Both modes consume the same awareness data (per-peer `{x, y, hue, ts}`); only
the renderer differs.

## Consequences

- **Pros.** Two distinct emotional registers from one data model. Free is
  ambient and aimless; river feels like "drainage" or "convergence." Easy to
  A/B in a room — flip the toggle and watch the pattern morph.
- **Cons.** The river-mode flow term is more compute (one extra dot product
  per pixel) and slightly less peaceful — the visible motion can read as
  "tense" if peers are moving fast.
- **Tuning.** The flow gain (`2.0` in the formula) was chosen by eye on a
  4-phone test. Larger gains start to dominate the sine interference; smaller
  gains lose the directional feel.

## Alternatives considered

- **Center-of-mass sink instead of geometric center.** Would mean the sink
  drifts with the crowd. Rejected for v1 — having a fixed visual anchor
  (the center) is what makes "we are flowing toward it" legible.
- **User-configurable sink point.** Rejected — adds UX complexity for what is
  already a binary choice. The center is a Schelling point that needs no
  explanation.
- **Always-on flow with intensity slider.** Considered but conflated two
  axes: "how strong is the sine field" and "how directional is the bias."
  Keeping them separate (intensity slider × free/river toggle) gives more
  expressive range.
