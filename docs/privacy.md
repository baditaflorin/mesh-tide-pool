# Privacy threat model — mesh-tide-pool

## What other peers in the same room can see

- Your phone's current drop position `(x, y)` in the shared 0..1 pool — driven
  by your phone's `DeviceOrientation` (gamma, beta) or your finger drag.
- Your chosen hue (0..359°).
- A `Date.now()` timestamp attached to each position update for freshness.
- Your Yjs awareness `clientID` — a per-session 32-bit random integer
  regenerated on every page load. Not stable across reloads.

That is the entire payload. No IMU magnitudes, no compass heading, no name,
no location.

## What stays local

- Your room ID, hue, mode, and intensity slider are in `localStorage` and
  never leave your device.

## What the signaling server can see

`signaling-server` (mine, source at
https://github.com/baditaflorin/signaling-server) sees:

- The **room name** (`mesh-tide-pool:<roomId>`).
- Encrypted **SDP** offer/answer blobs being relayed between peers.
- The IP address of the peer making the WebSocket connection.

It does **not** see your drop position or hue — application traffic flows
peer-to-peer over WebRTC DataChannel once SDP is exchanged.

## What the TURN server can see

`coturn-hetzner` relays encrypted WebRTC media/data when peers cannot connect
directly. It sees IP addresses and encrypted DTLS-SRTP / DataChannel bytes,
but cannot decrypt them.

## Permissions asked

- `DeviceOrientationEvent.requestPermission()` on iOS Safari, requested from
  a user tap on the arm button. If denied, the app falls back to finger-drag
  to move your drop.

## What's NOT in the threat model

- Stable identity. The Yjs clientID rotates per page load. If you need
  pseudonymous identity across sessions, you'd need to persist a UUID in
  `localStorage`; this app does not.
- Network observers. A hostile Wi-Fi owner can see the WebSocket connection
  to `turn.0docker.com` and a relay flow if TURN is needed, but cannot
  decrypt the contents.
