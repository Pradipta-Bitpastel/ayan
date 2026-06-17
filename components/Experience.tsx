"use client";

import { useState } from "react";
import SmoothScroll from "@/components/providers/SmoothScroll";
import CanvasRoot from "@/components/canvas/CanvasRoot";
import SplineModel from "@/components/canvas/SplineModel";
import NameLayer from "@/components/ui/NameLayer";
import HeroOverlay from "@/components/ui/HeroOverlay";
import PortraitCharacter from "@/components/ui/PortraitCharacter";
import Stage from "@/components/stage/Stage";
import Cursor from "@/components/ui/Cursor";
import Loader from "@/components/ui/Loader";
import ProgressReadout from "@/components/ui/ProgressReadout";

export default function Experience() {
  const [ready, setReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  return (
    <SmoothScroll>
      {/* Static darkroom wash — first-paint + no-WebGL fallback. Rendered BEFORE
          the canvas so the opaque WebGL paints over it when present (otherwise it
          dims all the colour). */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(120% 90% at 50% 38%, rgba(201,162,75,0.12), rgba(10,10,13,0) 55%), radial-gradient(80% 60% at 50% 50%, rgba(92,122,153,0.08), transparent 70%)",
        }}
      />

      {/* WebGL atmosphere */}
      <CanvasRoot />

      {/* Spline — now a subordinate background accent */}
      <SplineModel />

      {/* Ayan — the main character, above the background 3D */}
      <PortraitCharacter />

      {/* The persistent, racking name */}
      <NameLayer />

      {/* Hero editorial layer — kicker, animated tagline, framing HUD, parallax */}
      <HeroOverlay ready={ready} />

      {/* The single pinned section + all scenes */}
      <main>
        <Stage ready={ready} />
      </main>

      <ProgressReadout />
      <Cursor />
      <div className="grain" aria-hidden />

      {showLoader && (
        <Loader
          onComplete={() => {
            setReady(true);
            window.setTimeout(() => setShowLoader(false), 150);
          }}
        />
      )}
    </SmoothScroll>
  );
}
