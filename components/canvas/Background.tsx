"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ScreenQuad } from "@react-three/drei";
import * as THREE from "three";
import { stage, damp, PALETTES } from "@/lib/stage";

/**
 * The signature backdrop: a full-screen, domain-warped fbm gradient that flows
 * like liquid light. Its palette lerps between per-section moods as you scroll,
 * it bends toward the pointer, and it blooms a soft accent glow where you point.
 * Rendered as a camera-independent ScreenQuad so it always fills the frame.
 */
const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uAspect;
  uniform vec2  uMouse;
  uniform float uFocus;
  uniform float uGlow;
  uniform float uProgress;
  uniform vec3  uBg;
  uniform vec3  uA;
  uniform vec3  uB;
  uniform vec3  uC;

  vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec2 mod289(vec2 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
    vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g; g.x = a0.x*x0.x + h.x*x0.y;
    g.yz = a0.yz*x12.xz + h.yz*x12.yw;
    return 130.0 * dot(m, g);
  }
  float fbm(vec2 p){
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++){ s += a * snoise(p); p *= 2.0; a *= 0.5; }
    return s;
  }

  void main() {
    vec2 p = (vUv - 0.5); p.x *= uAspect;
    vec2 m = uMouse * vec2(0.5 * uAspect, 0.5);
    float t = uTime * 0.06;

    // hero is the showpiece: the flow, ribbons and pointer ripples run hot here
    // and settle to a calm baseline once you scroll into the content sections.
    float heroAmt = smoothstep(0.16, 0.0, uProgress);
    float vivid = mix(0.4, 1.0, heroAmt);

    // the cursor shoves the field aside — a soft push that bends the flow around it
    vec2 toM = p - m;
    float dM = length(toM);
    float push = exp(-dM * 2.4) * (0.6 + 0.6 * heroAmt);
    vec2 warp = normalize(toM + 1e-4) * push * 0.16;

    // flowing, domain-warped liquid light
    vec2 q = vec2(fbm(p * 1.15 + t + warp), fbm(p * 1.15 + vec2(3.1, 1.7) - t + warp));
    float f = fbm(p * 1.25 + 1.6 * q) * 0.5 + 0.5;

    // aurora ribbons — undulating bands of light woven through the flow
    float ribbon = sin(p.y * 3.0 + q.x * 2.6 + uTime * 0.3) * 0.5 + 0.5;
    ribbon = pow(ribbon, 2.2);

    // Moody by default: the dark base owns most of the frame, cyan flow rises in
    // the mid pockets, and the ice accent only flares where the ribbons peak —
    // cinematic dark + neon, not a flat wash.
    float grad = clamp(f * 0.78 + 0.05 + length(q) * 0.22, 0.0, 1.0);
    vec3 col = uBg;
    col = mix(col, uA, smoothstep(0.04, 0.46, grad));
    col = mix(col, uB, smoothstep(0.46, 0.82, grad) * (0.45 + ribbon * 0.6));
    col = mix(col, uC, smoothstep(0.8, 1.0, grad) * (0.4 + ribbon * 0.85));

    // neon flow streaks in the brighter pockets
    col += uC * ribbon * 0.22 * vivid * smoothstep(0.45, 0.98, f);
    // faint large-scale hue drift for richness
    col += uA * 0.12 * (sin(p.x * 1.1 + uTime * 0.12) * 0.5 + 0.5);

    // pointer interaction: a soft bloom + concentric ripple rings off the cursor
    float glow = exp(-dM * 1.9);
    float ring = sin(dM * 24.0 - uTime * 1.7) * 0.5 + 0.5;
    ring *= exp(-dM * 3.2);
    col += uC * (glow * 0.5 + ring * 0.28 * vivid) * uGlow;

    // vignette + slight desaturation while defocused
    col *= 1.0 - 0.4 * dot(p, p);
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(lum), uFocus * 0.3);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function Background() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();
  const mouse = useRef(new THREE.Vector2(0, 0));
  const sm = useRef(0);

  // Pre-convert palettes to THREE.Color for cheap per-frame lerping.
  const colors = useMemo(
    () =>
      PALETTES.map((p) => p.map((hex) => new THREE.Color(hex)) as THREE.Color[]),
    []
  );
  const cur = useMemo(
    () => ({
      bg: new THREE.Color(),
      a: new THREE.Color(),
      b: new THREE.Color(),
      c: new THREE.Color(),
    }),
    []
  );

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uFocus: { value: 1 },
      uGlow: { value: 1 },
      uProgress: { value: 0 },
      uBg: { value: new THREE.Color(PALETTES[0][0]) },
      uA: { value: new THREE.Color(PALETTES[0][1]) },
      uB: { value: new THREE.Color(PALETTES[0][2]) },
      uC: { value: new THREE.Color(PALETTES[0][3]) },
    }),
    []
  );

  useFrame((state, dt) => {
    const u = mat.current?.uniforms;
    if (!u) return;
    u.uTime.value = state.clock.elapsedTime;
    u.uAspect.value = size.width / size.height;
    u.uProgress.value = stage.progress;

    // snappier pointer so the ripple/push tracks the cursor responsively
    mouse.current.x = damp(mouse.current.x, stage.pointer.x, 9, dt);
    mouse.current.y = damp(mouse.current.y, stage.pointer.y, 9, dt);
    u.uMouse.value.copy(mouse.current);

    sm.current = damp(sm.current, stage.focus, 6, dt);
    u.uFocus.value = sm.current;

    // Interpolate the section palette from scroll progress.
    const n = colors.length;
    const f = stage.progress * (n - 1);
    const i = Math.min(n - 2, Math.max(0, Math.floor(f)));
    const t = Math.min(1, Math.max(0, f - i));
    cur.bg.copy(colors[i][0]).lerp(colors[i + 1][0], t);
    cur.a.copy(colors[i][1]).lerp(colors[i + 1][1], t);
    cur.b.copy(colors[i][2]).lerp(colors[i + 1][2], t);
    cur.c.copy(colors[i][3]).lerp(colors[i + 1][3], t);
    (u.uBg.value as THREE.Color).lerp(cur.bg, 0.08);
    (u.uA.value as THREE.Color).lerp(cur.a, 0.08);
    (u.uB.value as THREE.Color).lerp(cur.b, 0.08);
    (u.uC.value as THREE.Color).lerp(cur.c, 0.08);
  });

  return (
    <ScreenQuad renderOrder={-10}>
      <shaderMaterial
        ref={mat}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </ScreenQuad>
  );
}
