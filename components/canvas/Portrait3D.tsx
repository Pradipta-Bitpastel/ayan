"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { stage, damp } from "@/lib/stage";

/**
 * The photographer steps into his own frame. Ayan's portrait emerges from
 * darkroom grain into focus as you scroll into the "Captured Light" section —
 * a real develop: film grain + chromatic split resolving to a sharp photo, with
 * a soft cursor parallax. Replaces a conventional gallery with something
 * personal and on-theme.
 */
const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform float uReveal;
  uniform float uTime;
  uniform float uFocus;
  uniform vec2  uMouse;
  varying vec2 vUv;

  float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    float dev = smoothstep(0.0, 1.0, uReveal);

    // cursor parallax
    vec2 uv = vUv + uMouse * 0.01 * dev;

    // subtle chromatic split — closes to clean as it develops
    float ca = (1.0 - dev) * 0.012 + uFocus * 0.006;
    float r = texture2D(uTex, uv + vec2(ca, 0.0)).r;
    float g = texture2D(uTex, uv).g;
    float b = texture2D(uTex, uv - vec2(ca, 0.0)).b;
    float a = texture2D(uTex, uv).a;
    vec3 photo = vec3(r, g, b);

    // fine darkroom grain (true film grain, not blocks) that resolves away
    float grain = rand(uv * 1600.0 + floor(uTime * 10.0));
    vec3 grainy = mix(vec3(0.015), vec3(0.09, 0.07, 0.045), grain);

    // smooth fine-grain dissolve that ALWAYS fully resolves at dev=1
    float delay = rand(floor(uv * 260.0)) * 0.28 + (1.0 - uv.y) * 0.1;
    float mask = smoothstep(0.0, 0.4, dev - delay);

    vec3 col = mix(grainy, photo, mask);
    // gentle warm darkroom grade
    col = mix(col, col * vec3(1.06, 1.0, 0.88), 0.25);

    float alpha = a * mask;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

export default function Portrait3D() {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const tex = useTexture("/ayan.png");
  const reveal = useRef(0);
  const mouse = useRef(new THREE.Vector2());
  const sm = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTex: { value: tex },
      uReveal: { value: 0 },
      uTime: { value: 0 },
      uFocus: { value: 0 },
      uMouse: { value: new THREE.Vector2() },
    }),
    [tex]
  );

  useFrame((state, dt) => {
    const u = mat.current?.uniforms;
    const m = mesh.current;
    if (!u || !m) return;
    u.uTime.value = state.clock.elapsedTime;

    // reveal peaks at the photography station (~progress 0.62)
    const target = Math.max(0, 1 - Math.abs(stage.progress - 0.62) / 0.15);
    reveal.current = damp(reveal.current, target, 4, dt);
    u.uReveal.value = reveal.current;

    sm.current = damp(sm.current, stage.focus, 6, dt);
    u.uFocus.value = sm.current;

    mouse.current.x = damp(mouse.current.x, stage.pointer.x, 2.5, dt);
    mouse.current.y = damp(mouse.current.y, stage.pointer.y, 2.5, dt);
    u.uMouse.value.copy(mouse.current);

    // Anchored to the bottom: the figure rises a touch from below as it develops,
    // and its hard crop edge sits beyond the lower edge so no floating cut shows.
    m.position.x = damp(m.position.x, 2.3, 4, dt);
    m.position.y = damp(m.position.y, -1.55 - (1 - reveal.current) * 0.3, 4, dt);
    m.rotation.z = stage.pointer.x * 0.015;
  });

  // Large + bottom-anchored. Square plane, figure centred in the PNG, so pushing
  // it well below centre puts the chest crop under the fold.
  return (
    <mesh ref={mesh} position={[2.3, -1.55, 0.1]}>
      <planeGeometry args={[5, 5]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
