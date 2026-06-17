"use client";

import { useEffect, useRef } from "react";
import { stage, damp } from "@/lib/stage";

/**
 * Ayan — the main character. A crisp DOM image layer that lives ABOVE the Spline
 * accent and below the UI, present across every content scene. It's bottom-
 * anchored and sized so the figure sits cleanly in frame (no floating crop), and
 * the Stage choreographs it: it develops in once, then re-focuses (a soft rack)
 * on each scene change, with a gentle cursor parallax. The background 3D (Spline)
 * stays subordinate to it.
 */
export default function PortraitCharacter() {
  const inner = useRef<HTMLDivElement>(null);

  // Cursor parallax on the inner element (the outer is driven by the Stage GSAP
  // reveal, so keeping these separate avoids a transform tug-of-war).
  useEffect(() => {
    let raf = 0;
    let x = 0, y = 0;
    const tick = () => {
      x = damp(x, stage.pointer.x * -1.4, 3, 0.016);
      y = damp(y, stage.pointer.y * 1.2, 3, 0.016);
      if (inner.current) inner.current.style.transform = `translate(${x}%, ${y}%)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div id="portrait" className="portrait-layer" aria-hidden>
      <div ref={inner} className="portrait-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ayan.png" alt="Ayan Hore" className="portrait-img" />
        <span className="portrait-grain" />
        {/* soft edge fades so he melts into the scene, never a hard rectangle */}
        <span className="portrait-vignette" />
      </div>
    </div>
  );
}
