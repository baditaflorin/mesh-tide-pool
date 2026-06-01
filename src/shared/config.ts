export const appConfig = {
  appName: "mesh-tide-pool",
  storagePrefix: "mesh-tide-pool",
  description:
    "Each phone is a drop in a shared 2D wave pool. Tilt (or drag) to move your drop; every phone renders the same live interference field. Open on two phones in one room to try it.",
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
