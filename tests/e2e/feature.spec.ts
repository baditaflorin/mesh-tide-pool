import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

type Drop = { x: number; y: number; hue: number; ts: number };

/**
 * Advertised core action: "Each phone is a drop in a shared 2D wave pool. Tilt
 * to move." The drop's position must propagate peer→peer, otherwise every phone
 * renders a different field and the "shared pool" claim is a lie.
 *
 * This test drives the *real* tilt path on peer A (synthetic
 * DeviceOrientationEvent, which `useTilt`/`useDeviceOrientation` in mesh-common
 * listen for) and asserts peer B sees peer A's resulting (x, y) drop position
 * — read straight off peer B's own awareness, NOT peer A's local state.
 *
 * It is load-bearing: if the tilt position only ever landed in peer A's local
 * `myPosRef`/React state and never reached the Yjs awareness publish, peer B's
 * `__tideRemoteDrops` would stay empty and the position assertion would fail.
 */
test("tilt moves peer A's drop and peer B sees the new position", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    // Arm both peers: click "Allow tilt and connect" to mount the mesh + the
    // awareness publish loop on each page.
    await a.getByRole("button", { name: /allow tilt and connect/i }).click();
    await b.getByRole("button", { name: /allow tilt and connect/i }).click();

    // Both should reach the live stage (canvas present).
    await expect(a.locator(".tide-canvas")).toBeVisible();
    await expect(b.locator(".tide-canvas")).toBeVisible();

    // Drive the REAL tilt path on peer A: a strong right + forward tilt.
    // gamma 45 → x ≈ 0.5 + 45/60 = 1.0 (clamped); beta 60 → y ≈ 0.5 + 30/60 = 1.0.
    // This is the same DeviceOrientationEvent useDeviceOrientation subscribes to.
    const drive = async () =>
      a.evaluate(() => {
        window.dispatchEvent(
          new DeviceOrientationEvent("deviceorientation", {
            alpha: 0,
            beta: 60,
            gamma: 45,
          } as DeviceOrientationEventInit),
        );
      });
    await drive();

    // Poll peer B's OWN awareness state until it carries peer A's tilt-driven
    // position. The tilt's first publish may race the dispatch, so we re-fire
    // the orientation event each poll iteration; the assertion only goes green
    // once the moved corner position (≈1.0, ≈1.0), NOT the default center
    // (0.5, 0.5), has crossed the mesh to peer B.
    //
    // Load-bearing: if peer A's tilt only mutated its local `myPosRef`/React
    // state and never reached the awareness publish, `__tideRemoteDrops` on
    // peer B would stay at the center default forever and this poll would
    // time out.
    await expect
      .poll(
        async () => {
          await drive();
          return b.evaluate(() => {
            const drops = (window as unknown as { __tideRemoteDrops?: Drop[] }).__tideRemoteDrops;
            if (!drops || drops.length === 0) return -1;
            // Peer B should see exactly one remote drop here (peer A).
            const d = drops[0]!;
            // Combined corner-ness: only high when BOTH axes moved to the far
            // corner. Center default (0.5, 0.5) → 0.5; corner (1, 1) → 1.0.
            return Math.min(d.x, d.y);
          });
        },
        { timeout: 15_000, intervals: [250, 500, 1000] },
      )
      .toBeGreaterThan(0.85);
  } finally {
    await cleanup();
  }
});
