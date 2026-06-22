"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { stage, damp, mapClamp } from "@/lib/stage";

/**
 * "AYAN HORE" rendered as a field of light — a few thousand additive motes that
 * start scattered, stream in and assemble into the wordmark as the loader
 * resolves, drift and shimmer in place, scatter away from the cursor, and
 * dissolve back into dust as you scroll on. For a photographer whose thesis is
 * "I photograph light," the name is literally made of light. No bevels, no
 * chrome, no WordArt — a living constellation.
 *
 * The glyph coverage is sampled once from an offscreen canvas into per-particle
 * home positions; everything else (assemble, idle, cursor repel, fade) happens on
 * the GPU from a handful of uniforms, so it stays cheap.
 */
const vert = /* glsl */ `
  attribute vec3 aHome;
  attribute vec3 aScatter;
  attribute float aPhase;
  attribute float aSize;
  uniform float uTime;
  uniform float uReveal;   // 0 scattered → 1 assembled
  uniform float uOpacity;
  uniform float uSize;
  uniform float uActive;   // 0 until the pointer has moved
  uniform vec2  uMouse;
  varying float vA;
  varying float vT;
  varying float vGlow;

  void main() {
    // staggered assemble: each mote eases home on its own slightly delayed beat
    float d = clamp((uReveal - aPhase * 0.35) / 0.65, 0.0, 1.0);
    d = d * d * (3.0 - 2.0 * d);
    vec3 pos = mix(aScatter, aHome, d);

    // idle shimmer around the home position
    float fl = mix(0.05, 0.02, d);
    pos.x += sin(uTime * 0.8 + aPhase * 30.0) * fl;
    pos.y += cos(uTime * 0.7 + aPhase * 24.0) * fl;
    pos.z += sin(uTime * 0.5 + aPhase * 18.0) * fl;

    // cursor LIGHT — motes near the pointer brighten, swell and lift a touch
    // toward the viewer, as if a light is passing over them. The name keeps its
    // shape (no destructive repel). uActive gates it off until the user moves.
    vec2 toM = pos.xy - uMouse;
    float dist = length(toM);
    float glow = smoothstep(0.62, 0.0, dist) * d * uActive;
    pos.z += glow * 0.28;                          // gentle lift toward camera
    pos.xy += normalize(toM + 1e-4) * glow * 0.03; // barely-there shimmer

    // a slow shimmer sweeping left→right across the wordmark
    float sweep = 0.72 + 0.38 * sin(aHome.x * 1.15 - uTime * 1.5);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uSize / max(0.1, -mv.z) * (1.0 + glow * 1.6);
    vA = uOpacity * (0.22 + 0.78 * d) * sweep;
    vGlow = glow;
    vT = aPhase;
  }
`;

const frag = /* glsl */ `
  precision highp float;
  uniform vec3 uColA;
  uniform vec3 uColB;
  varying float vA;
  varying float vT;
  varying float vGlow;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    float a = smoothstep(0.5, 0.0, r);
    a *= a;
    vec3 col = mix(uColA, uColB, vT);
    // the cursor light blooms the nearby motes toward bright ice-white
    col += vGlow * vec3(0.55, 0.72, 0.9);
    gl_FragColor = vec4(col, a * (vA + vGlow * 0.45));
  }
`;

export default function WordMarkParticles({ tier }: { tier: "high" | "mid" | "low" }) {
  const pts = useRef<THREE.Points>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const sm = useRef(1); // smoothed focus (1 = loading)

  const { geometry, uniforms } = useMemo(() => {
    // 1) draw the wordmark to an offscreen canvas and read its coverage
    const cw = 1600;
    const ch = 380;
    const cvs = document.createElement("canvas");
    cvs.width = cw;
    cvs.height = ch;
    const ctx = cvs.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    try {
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "-10px";
    } catch {}
    ctx.font = "900 250px Arial, 'Helvetica Neue', sans-serif";
    ctx.fillText("AYAN HORE", cw / 2, ch / 2 + 8);
    const data = ctx.getImageData(0, 0, cw, ch).data;

    // 2) sample filled pixels into world-space home positions
    const stride = tier === "high" ? 3 : tier === "mid" ? 5 : 7;
    const worldW = 8.2; // wordmark spans ~8 units
    const sx = worldW / cw;
    const homes: number[] = [];
    for (let y = 0; y < ch; y += stride) {
      for (let x = 0; x < cw; x += stride) {
        const a = data[(y * cw + x) * 4 + 3];
        if (a > 130) {
          // small jitter so it reads as dust, not a grid
          const jx = (Math.random() - 0.5) * stride * sx;
          const jy = (Math.random() - 0.5) * stride * sx;
          homes.push((x - cw / 2) * sx + jx, -(y - ch / 2) * sx + jy, (Math.random() - 0.5) * 0.5);
        }
      }
    }
    const n = homes.length / 3;

    const aHome = new Float32Array(homes);
    const aScatter = new Float32Array(n * 3);
    const aPhase = new Float32Array(n);
    const aSize = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      // scatter from a wide cloud all around the frame
      const ang = Math.random() * Math.PI * 2;
      const rad = 5 + Math.random() * 7;
      aScatter[i * 3 + 0] = Math.cos(ang) * rad;
      aScatter[i * 3 + 1] = (Math.random() - 0.5) * 9;
      aScatter[i * 3 + 2] = Math.sin(ang) * rad - 2;
      aPhase[i] = Math.random();
      aSize[i] = 5 + Math.random() * 9;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("aHome", new THREE.BufferAttribute(aHome, 3));
    g.setAttribute("position", new THREE.BufferAttribute(aHome.slice(), 3));
    g.setAttribute("aScatter", new THREE.BufferAttribute(aScatter, 3));
    g.setAttribute("aPhase", new THREE.BufferAttribute(aPhase, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1));

    const u = {
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uOpacity: { value: 0 },
      uSize: { value: 5 },
      uActive: { value: 0 },
      uMouse: { value: new THREE.Vector2(99, 99) },
      uColA: { value: new THREE.Color("#7fd8ff") },
      uColB: { value: new THREE.Color("#fff3da") },
    };
    return { geometry: g, uniforms: u };
  }, [tier]);

  useFrame((state, dt) => {
    const u = mat.current?.uniforms;
    if (!u) return;
    u.uTime.value = state.clock.elapsedTime;

    // Fit the ~8.2-unit-wide wordmark to the viewport so it never clips on narrow
    // or portrait screens (tablets, small desktop windows). Scaling the points
    // group is transparent to the cursor-light math, which works in local space.
    if (pts.current) {
      const target = Math.max(0.34, Math.min(1, (state.viewport.width * 0.86) / 8.2));
      const s = damp(pts.current.scale.x, target, 4, dt);
      pts.current.scale.setScalar(s);
    }

    sm.current = damp(sm.current, stage.focus, 3.5, dt);
    const reveal = 1 - sm.current; // assembles as the loader resolves focus
    const scrollOut = mapClamp(stage.progress, 0.0, 0.1, 1, 0);
    u.uReveal.value = reveal;
    u.uOpacity.value = scrollOut;
    if (pts.current) pts.current.visible = scrollOut > 0.001;

    // pointer in the wordmark's world plane (≈ z -0.5); repel stays off until the
    // user actually moves, so the resting name never blows its centre apart.
    u.uActive.value = damp(u.uActive.value, stage.pointerMoved ? 1 : 0, 4, dt);
    (u.uMouse.value as THREE.Vector2).set(stage.pointer.x * 4.2, stage.pointer.y * 2.5);
  });

  return (
    <points ref={pts} position={[0, 0.1, -0.5]} frustumCulled={false}>
      <primitive object={geometry} attach="geometry" />
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
