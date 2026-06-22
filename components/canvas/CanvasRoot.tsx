"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useDevice } from "@/lib/useDevice";
import { CanvasErrorBoundary } from "./CanvasErrorBoundary";

// Three.js stays out of the server bundle + critical path.
const Scene = dynamic(() => import("./Scene"), { ssr: false });

export default function CanvasRoot() {
  const { webgl, tier, resolved } = useDevice();

  // Keep the WebGL element referentially stable across re-renders (loader → ready
  // toggles, etc). The EffectComposer must not be re-rendered after mount, so we
  // only ever produce a new Scene element when the quality tier actually changes.
  const scene = useMemo(() => <Scene tier={tier} />, [tier]);

  // Wait for the device to resolve before mounting, so the canvas mounts ONCE at
  // the real tier instead of mounting at the SSR default (high) and immediately
  // remounting at the device's tier — that remount is a prime trigger for the
  // EffectComposer context race. Until then the CSS darkroom backdrop carries it.
  if (!webgl || !resolved) return null;

  return (
    <div className="fixed inset-0 z-0" aria-hidden>
      <CanvasErrorBoundary>{scene}</CanvasErrorBoundary>
    </div>
  );
}
