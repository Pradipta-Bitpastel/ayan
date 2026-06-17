"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { stage, damp } from "@/lib/stage";

/**
 * Darkroom dust in a beam of light: a few hundred additive bokeh motes drifting
 * slowly, parallaxing to the pointer. Cheap (one BufferGeometry of points), and
 * it softens along with everything else during a focus pull.
 */
export default function ParticleField({ count = 320 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  const mat = useRef<THREE.PointsMaterial>(null);
  const px = useRef(0);
  const py = useRef(0);

  const { positions, scales, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 11;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
      scales[i] = Math.random();
      speeds[i] = 0.15 + Math.random() * 0.5;
    }
    return { positions, scales, speeds };
  }, [count]);

  // Round, soft bokeh sprite drawn to a canvas once.
  const sprite = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d")!;
    // cool/neutral bokeh so the motes read on both the cool and warm sections
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(214,236,255,0.9)");
    g.addColorStop(0.4, "rgba(150,196,236,0.32)");
    g.addColorStop(1, "rgba(150,196,236,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    return tex;
  }, []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const geo = points.current?.geometry;
    if (geo) {
      const arr = geo.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] += speeds[i] * dt * 0.18;
        arr[i * 3 + 0] += Math.sin(t * 0.2 + i) * dt * 0.04;
        if (arr[i * 3 + 1] > 6) arr[i * 3 + 1] = -6;
      }
      geo.attributes.position.needsUpdate = true;
    }

    // Pointer parallax + soften with the focus pull.
    px.current = damp(px.current, stage.pointer.x, 3, dt);
    py.current = damp(py.current, stage.pointer.y, 3, dt);
    if (points.current) {
      points.current.position.x = px.current * 0.5;
      points.current.position.y = py.current * 0.35;
      points.current.rotation.z = px.current * 0.02;
    }
    if (mat.current) {
      // Motes bloom larger + brighter as the field defocuses.
      mat.current.size = 0.16 + stage.focus * 0.5;
      mat.current.opacity = 0.5 + stage.focus * 0.3;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute attach="attributes-scale" args={[scales, 1]} />
      </bufferGeometry>
      <pointsMaterial
        ref={mat}
        size={0.18}
        map={sprite}
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
