"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { stage, damp, mapClamp } from "@/lib/stage";
import { useDevice } from "@/lib/useDevice";

// Lazy — Spline's runtime is heavy and must never touch the server bundle.
const Spline = dynamic(() => import("@splinetool/react-spline"), { ssr: false });

/**
 * A tasteful default Spline centrepiece, layered over the R3F atmosphere. Swap
 * SPLINE_SCENE for your own model: open it at app.spline.design, Export → and
 * copy the "prod.spline.design/.../scene.splinecode" URL.
 *
 * It runs in its own canvas (so it can't share the R3F postprocessing), but we
 * still choreograph it like the orb — a scroll/pointer-driven CSS transform moves
 * it to the right in content scenes and hides it during the portrait. If the
 * scene fails to load (offline / blocked), we leave `splineActive` false and the
 * code glass orb stays as the fallback.
 */
// Spline centrepiece. Empty = use the on-brand lens/glass orb instead.
// Disabled: the default robot model reads as a half-cut figure ghosting behind
// the copy and clashes with the darkroom/lens aesthetic. The LensOrb fallback is
// on-brand (an aperture/lens) and never crops. Drop a real, on-theme scene URL
// here to re-enable.
const SPLINE_SCENE = "";

export default function SplineModel() {
  const { webgl, tier } = useDevice();
  const holder = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  // Choreograph the Spline container from the shared stage, no React re-renders.
  useEffect(() => {
    if (failed) return;
    let raf = 0;
    let x = 0, y = 0, s = 1, o = 0, px = 0, py = 0;
    const tick = () => {
      const hero = mapClamp(stage.progress, 0.0, 0.12, 1, 0);
      // Subordinate background accent: small, drifting left/back, well clear of
      // the portrait (right) and low opacity so Ayan stays the focus.
      const tx = -14 - (1 - hero) * 8; // vw to the left
      const ty = -6 + (1 - hero) * 2;
      const ts = 0.5 + hero * 0.12;
      const to = stage.splineActive ? 0.4 + hero * 0.15 : 0;
      px = damp(px, stage.pointer.x * 2.5, 3, 0.016);
      py = damp(py, stage.pointer.y * -2.0, 3, 0.016);
      x = damp(x, tx, 3, 0.016);
      y = damp(y, ty, 3, 0.016);
      s = damp(s, ts, 3, 0.016);
      o = damp(o, to, 4, 0.016);
      if (holder.current) {
        holder.current.style.transform = `translate(calc(${x}vw + ${px}%), calc(${y}vh + ${py}%)) scale(${s})`;
        holder.current.style.opacity = String(o);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [failed]);

  // No scene configured, or low-power / no-WebGL → the code orb carries it and
  // the heavy Spline runtime is never even imported.
  if (!SPLINE_SCENE || !webgl || tier === "low" || failed) return null;

  return (
    <div
      ref={holder}
      aria-hidden
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 5, opacity: 0, filter: "blur(2px)", willChange: "transform, opacity" }}
    >
      <Spline
        scene={SPLINE_SCENE}
        onLoad={() => {
          stage.splineActive = true;
        }}
        onError={() => {
          stage.splineActive = false;
          setFailed(true);
        }}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
