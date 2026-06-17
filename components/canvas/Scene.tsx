"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { stage, damp } from "@/lib/stage";
import { useDevice } from "@/lib/useDevice";
import Background from "./Background";
import LensOrb from "./LensOrb";
import ParticleField from "./ParticleField";
import WordMarkParticles from "./WordMarkParticles";
import Effects from "./Effects";

/** Scroll flies the camera through the scene — a slow dolly + cursor parallax so
 *  the whole thing reads as one continuous shot. */
function CameraRig() {
  const cx = useRef(0);
  const cy = useRef(0);
  const cz = useRef(6);

  useFrame(({ camera }, dt) => {
    cx.current = damp(cx.current, stage.pointer.x, 2.2, dt);
    cy.current = damp(cy.current, stage.pointer.y, 2.2, dt);
    // dolly in slightly through the story, then ease back for the finale
    const arc = Math.sin(stage.progress * Math.PI); // 0 → 1 → 0
    cz.current = damp(cz.current, 6 - arc * 1.4, 2.5, dt);
    camera.position.x = cx.current * 0.45;
    camera.position.y = cy.current * 0.32;
    camera.position.z = cz.current;
    camera.lookAt(0, 0, -0.6);
  });
  return null;
}

export default function Scene({ tier }: { tier: "high" | "mid" | "low" }) {
  const { reducedMotion } = useDevice();
  // Cap DPR hard — postprocessing at native 2× retina is what kills the frame
  // rate. 1.5 is indistinguishable here and ~1.8× cheaper.
  const dpr: [number, number] =
    tier === "high" ? [1, 1.5] : tier === "mid" ? [1, 1.25] : [1, 1];
  const particles = tier === "high" ? 150 : tier === "mid" ? 90 : 50;
  const wordmark3D = tier !== "low" && !reducedMotion;

  return (
    <Canvas
      style={{ position: "fixed" }}
      dpr={dpr}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      camera={{ fov: 42, position: [0, 0, 6] }}
    >
      <Background />
      <CameraRig />
      <LensOrb tier={tier} />
      {wordmark3D && <WordMarkParticles tier={tier} />}
      <ParticleField count={particles} />
      <Effects tier={tier} />
    </Canvas>
  );
}
