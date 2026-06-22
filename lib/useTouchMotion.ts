"use client";

import { useEffect } from "react";
import { stage, damp } from "@/lib/stage";

type OrientationPermissionAPI = {
  requestPermission?: () => Promise<"granted" | "denied">;
};

/**
 * Touch devices have no cursor, so every effect keyed to `stage.pointer` (the name
 * spotlight, hero parallax, portrait lean, the R3F camera rig) would sit dead at
 * 0,0. This hook supplies the missing input on coarse pointers:
 *
 *   • device orientation (tilt) where available — the phone itself becomes the
 *     "cursor", so leaning it pans the parallax. On iOS 13+ this needs an explicit
 *     permission grant, which must happen inside a user gesture, so we request it
 *     on the first touch and attach the listener only if granted.
 *   • a gentle automatic idle drift as the baseline AND the fallback when gyro is
 *     unavailable or denied — so the world always feels alive, permission or not.
 *
 * Disabled entirely under reduced-motion (the drift IS motion) and on fine
 * pointers (the real cursor already drives everything).
 */
export function useTouchMotion(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let raf = 0;
    let clock = 0;
    // live target the pointer eases toward
    let tx = 0;
    let ty = 0;
    // latest gyro reading (normalised −1..1); null until the first event lands
    let gyro: { x: number; y: number } | null = null;

    const clamp = (v: number) => Math.max(-1, Math.min(1, v));

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      // gamma: left/right tilt (−90..90) → x. beta: front/back tilt; ~45° is a
      // natural hand-held neutral, so offset from there → y (inverted to match the
      // pointer convention where +y is up).
      gyro = {
        x: clamp(e.gamma / 38),
        y: clamp(-(e.beta - 45) / 38),
      };
    };

    const tick = () => {
      clock += 0.016;
      // baseline idle drift — a slow lissajous so it never repeats too obviously
      const driftX = Math.sin(clock * 0.45) * 0.55;
      const driftY = Math.cos(clock * 0.37) * 0.4;
      if (gyro) {
        // tilt leads, with a whisper of drift so a perfectly still phone still
        // breathes rather than freezing dead-centre
        tx = gyro.x * 0.85 + driftX * 0.15;
        ty = gyro.y * 0.85 + driftY * 0.15;
      } else {
        tx = driftX;
        ty = driftY;
      }
      stage.pointer.x = damp(stage.pointer.x, tx, 2.5, 0.016);
      stage.pointer.y = damp(stage.pointer.y, ty, 2.5, 0.016);
      // mark moved so effects gated on a real interaction (the 3D wordmark light,
      // the name spotlight) switch on
      stage.pointerMoved = true;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // ── wire up the gyro (the drift loop runs regardless) ──────────────────
    const attach = () => window.addEventListener("deviceorientation", onOrient);
    const DOE = (typeof DeviceOrientationEvent !== "undefined"
      ? DeviceOrientationEvent
      : undefined) as unknown as OrientationPermissionAPI | undefined;

    let removeGesture: (() => void) | null = null;
    if (DOE?.requestPermission) {
      // iOS 13+: must ask from within a user gesture.
      const ask = async () => {
        try {
          const res = await DOE.requestPermission!();
          if (res === "granted") attach();
        } catch {
          /* denied / unsupported — auto-drift carries it */
        }
        removeGesture?.();
      };
      window.addEventListener("touchend", ask, { once: true });
      window.addEventListener("click", ask, { once: true });
      removeGesture = () => {
        window.removeEventListener("touchend", ask);
        window.removeEventListener("click", ask);
      };
    } else {
      // Android / older browsers: no permission gate.
      attach();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("deviceorientation", onOrient);
      removeGesture?.();
    };
  }, [enabled]);
}
