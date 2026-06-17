"use client";

import { useEffect, useRef } from "react";
import { stage } from "@/lib/stage";

const LABELS = [
  "Intro",
  "The Thesis",
  "Bitpastel",
  "AyaN Photography",
  "Recognition",
  "Connect",
];

/**
 * A camera-style readout pinned to the corner: a brass focus hairline tracking
 * scroll progress + a mono plate that names the current frame and flips between
 * "IN FOCUS" / "RACKING…". Updates straight from the shared stage in rAF — no
 * React re-renders.
 */
export default function ProgressReadout() {
  const bar = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const status = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = stage.progress;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      const idx = Math.min(LABELS.length - 1, Math.floor(p * LABELS.length + 0.0001));
      if (label.current && label.current.textContent !== LABELS[idx])
        label.current.textContent = LABELS[idx];
      const st = stage.focus > 0.25 ? "RACKING…" : "f/1.4 · IN FOCUS";
      if (status.current && status.current.textContent !== st)
        status.current.textContent = st;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 left-6 right-6 z-40 flex items-center gap-4">
      <div className="h-px flex-1 overflow-hidden bg-ink-700">
        <div
          ref={bar}
          className="h-full w-full origin-left"
          style={{ background: "var(--brass)", transform: "scaleX(0)" }}
        />
      </div>
      <span ref={label} className="t-mono whitespace-nowrap" style={{ color: "var(--paper-dim)" }}>
        Intro
      </span>
      <span ref={status} className="t-mono whitespace-nowrap" style={{ color: "var(--brass)" }}>
        f/1.4 · IN FOCUS
      </span>
    </div>
  );
}
