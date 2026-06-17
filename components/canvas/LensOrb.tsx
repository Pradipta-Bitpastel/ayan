"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { stage, damp, mapClamp, PALETTES } from "@/lib/stage";

/**
 * The recurring centrepiece: an iridescent, noise-displaced orb with a fresnel
 * rim — the "lens." It breathes, tilts toward the cursor, swells during focus
 * pulls, shifts colour with each section, and slides aside to make room for the
 * developing portrait. This is the through-line that makes the scroll feel like
 * one continuous shot.
 */
const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  uniform float uFreq;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vDisp;

  // Ashima simplex 3D noise
  vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
  vec4 mod289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
  vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    // gentle, low-frequency undulation — a smooth glass orb that breathes,
    // not a lumpy blob.
    float n = snoise(position * uFreq + uTime * 0.2);
    float disp = n * uAmp;
    vDisp = n;
    vec3 pos = position + normal * disp;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform vec3 uColC;
  uniform float uTime;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vDisp;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vView);
    float ndv = max(dot(N, V), 0.0);
    float fres = pow(1.0 - ndv, 3.0);

    // dark glass body: a deep core rising into a cool mid — kept dim so the lens
    // reads as translucent crystal, not a glowing ball (that blowout was the flicker).
    float t = vDisp * 0.5 + 0.5;
    vec3 body = mix(uColA, uColB, smoothstep(0.1, 0.95, t + sin(uTime * 0.25) * 0.04));

    // thin-film iridescence — sweeps with the view angle, reads as coated glass
    float irid = sin((N.x * 2.0 + N.y * 1.3 - N.z * 1.7) * 3.2 + uTime * 0.5) * 0.5 + 0.5;
    body = mix(body, uColC, irid * 0.3);

    // faint concentric "lens element" rings toward the rim
    float rings = sin(fres * 20.0 - uTime * 0.4) * 0.5 + 0.5;
    body += uColC * rings * fres * 0.1;

    // a single crisp specular glint, like light off polished crystal
    vec3 L = normalize(vec3(-0.5, 0.85, 0.6));
    float spec = pow(max(dot(reflect(-L, N), V), 0.0), 60.0);

    vec3 col = body;
    col += fres * uColC * 0.8;                 // luminous rim (restrained)
    col += spec * vec3(0.95, 0.99, 1.0) * 0.7; // glossy highlight

    // translucent: see-through core, dense bright rim — a real glass element.
    float alpha = (0.18 + fres * 0.9 + spec * 0.5) * uOpacity;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;

export default function LensOrb({ tier }: { tier: "high" | "mid" | "low" }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const sm = useRef(0);

  const detail = tier === "high" ? 18 : tier === "mid" ? 12 : 8;

  const colors = useMemo(
    () => PALETTES.map((p) => p.slice(1).map((h) => new THREE.Color(h))),
    []
  );
  const cur = useMemo(
    () => ({ a: new THREE.Color(), b: new THREE.Color(), c: new THREE.Color() }),
    []
  );

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0.08 },
      uFreq: { value: 1.0 },
      uOpacity: { value: 0 },
      uColA: { value: new THREE.Color(PALETTES[0][1]) },
      uColB: { value: new THREE.Color(PALETTES[0][2]) },
      uColC: { value: new THREE.Color(PALETTES[0][3]) },
    }),
    []
  );

  useFrame((state, dt) => {
    const u = mat.current?.uniforms;
    const m = mesh.current;
    if (!u || !m) return;
    const time = state.clock.elapsedTime;
    u.uTime.value = time;

    sm.current = damp(sm.current, stage.focus, 6, dt);
    u.uAmp.value = 0.04 + sm.current * 0.06; // subtle breathing only

    // slow spin + cursor tilt
    m.rotation.y += dt * 0.04;
    m.rotation.x = damp(m.rotation.x, -stage.pointer.y * 0.25, 3, dt);
    m.rotation.z = damp(m.rotation.z, stage.pointer.x * 0.08, 3, dt);

    // The lens is a CONSTANT, stable element — it never scales to ~0 (that
    // degenerate scale + bloom was the flicker). Instead it fades via uOpacity and
    // drifts: a large soft glass element behind the name in the hero, receding to
    // a small distant optic high in the upper-left of content scenes (clear of the
    // portrait, which owns the lower-right), and gone during the photo scene.
    const hero = mapClamp(stage.progress, 0.0, 0.14, 1, 0);

    const targetX = -2.6 + hero * 2.6;          // centre in hero → upper-left after
    const targetY = 1.4 - hero * 1.4;           // up high in content scenes
    const targetS = 1.9 - (1 - hero) * 1.05;    // big in hero, small after
    // opacity: subtle behind the name in hero, fainter accent in content scenes.
    const targetO = hero * 0.4 + (1 - hero) * 0.28;

    m.position.x = damp(m.position.x, targetX, 3.0, dt);
    m.position.y = damp(m.position.y, targetY, 3.0, dt);
    const s = damp(m.scale.x, targetS, 3.0, dt);
    m.scale.setScalar(s);
    u.uOpacity.value = damp(u.uOpacity.value, targetO, 4, dt);

    // section colour
    const n = colors.length;
    const f = stage.progress * (n - 1);
    const i = Math.min(n - 2, Math.max(0, Math.floor(f)));
    const tt = Math.min(1, Math.max(0, f - i));
    cur.a.copy(colors[i][0]).lerp(colors[i + 1][0], tt);
    cur.b.copy(colors[i][1]).lerp(colors[i + 1][1], tt);
    cur.c.copy(colors[i][2]).lerp(colors[i + 1][2], tt);
    (u.uColA.value as THREE.Color).lerp(cur.a, 0.08);
    (u.uColB.value as THREE.Color).lerp(cur.b, 0.08);
    (u.uColC.value as THREE.Color).lerp(cur.c, 0.08);
  });

  return (
    <mesh ref={mesh} position={[0, 0, -1.4]} scale={1} renderOrder={-5}>
      <icosahedronGeometry args={[1.6, detail]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
}
