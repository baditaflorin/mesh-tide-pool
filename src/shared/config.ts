export const appConfig = {
  appName: "mesh-tide-pool",
  storagePrefix: "mesh-tide-pool",
  description:
    "Peer-to-peer mesh tide pool. Each phone is a colored ripple; drag to mix; rooms drift between free pool and river → sink modes.",
  accentHex: "#4ec0f0",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
  repositoryUrl: "https://github.com/baditaflorin/mesh-tide-pool",
  pagesUrl: "https://baditaflorin.github.io/mesh-tide-pool/",
  signalingUrl:
    (import.meta.env.VITE_WEBRTC_SIGNALING as string | undefined) ?? "wss://turn.0docker.com/ws",
  turnTokenUrl:
    (import.meta.env.VITE_TURN_TOKEN_URL as string | undefined) ??
    "https://turn.0docker.com/credentials",
  paypalUrl: "https://www.paypal.com/paypalme/florinbadita",
} as const;
