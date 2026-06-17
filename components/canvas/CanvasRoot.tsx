"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useDevice } from "@/lib/useDevice";

// Three.js stays out of the server bundle + critical path.
const Scene = dynamic(() => import("./Scene"), { ssr: false });

export default function CanvasRoot() {
  const { webgl, tier } = useDevice();

  // Keep the WebGL element referentially stable across re-renders (loader → ready
  // toggles, etc). The EffectComposer must not be re-rendered after mount, so we
  // only ever produce a new Scene element when the quality tier actually changes.
  const scene = useMemo(() => <Scene tier={tier} />, [tier]);

  // No WebGL → the static darkroom backdrop (CSS) carries the look; the DOM
  // experience is fully usable without the canvas.
  if (!webgl) return null;

  return (
    <div className="fixed inset-0 z-0" aria-hidden>
      {scene}
    </div>
  );
}
