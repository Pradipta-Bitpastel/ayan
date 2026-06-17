"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  EffectComposer,
  ChromaticAberration,
  Vignette,
  Noise,
  Bloom,
  wrapEffect,
} from "@react-three/postprocessing";
import { BlendFunction, Effect } from "postprocessing";
import { Uniform, Vector2 } from "three";
import { stage, damp } from "@/lib/stage";

/* ── A cheap separable-ish defocus, driven by stage.focus ─────────────────
   Reads the composed WebGL frame and blends in a small poisson disk of taps,
   so the whole atmosphere softens during every rack between scenes. */
const focusFrag = /* glsl */ `
uniform float focus;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (focus < 0.002) { outputColor = inputColor; return; }
  vec2 r = focus * vec2(0.010) * vec2(1.0, resolution.x / resolution.y);
  vec4 s = inputColor;
  s += texture2D(inputBuffer, uv + vec2( 1.0,  0.0) * r);
  s += texture2D(inputBuffer, uv + vec2(-1.0,  0.0) * r);
  s += texture2D(inputBuffer, uv + vec2( 0.0,  1.0) * r);
  s += texture2D(inputBuffer, uv + vec2( 0.0, -1.0) * r);
  s += texture2D(inputBuffer, uv + vec2( 0.7,  0.7) * r);
  s += texture2D(inputBuffer, uv + vec2(-0.7,  0.7) * r);
  s += texture2D(inputBuffer, uv + vec2( 0.7, -0.7) * r);
  s += texture2D(inputBuffer, uv + vec2(-0.7, -0.7) * r);
  s /= 9.0;
  outputColor = mix(inputColor, s, clamp(focus, 0.0, 1.0));
}
`;

class FocusBlurEffectImpl extends Effect {
  constructor() {
    super("FocusBlurEffect", focusFrag, {
      uniforms: new Map([["focus", new Uniform(0)]]),
    });
  }
}
const FocusBlur = wrapEffect(FocusBlurEffectImpl);

export default function Effects({ tier }: { tier: "high" | "mid" | "low" }) {
  const focusRef = useRef<FocusBlurEffectImpl>(null);
  const caRef = useRef<{ offset: Vector2 }>(null);
  const sm = useRef(0); // smoothed focus

  const caOffset = useMemo(() => new Vector2(0, 0), []);

  useFrame((_, dt) => {
    sm.current = damp(sm.current, stage.focus, 6, dt);
    const f = sm.current;
    if (focusRef.current) {
      (focusRef.current.uniforms.get("focus") as Uniform).value = f;
    }
    if (caRef.current) {
      // Tiny baseline RGB split, opening up while defocused.
      const amt = 0.0006 + f * 0.004;
      caRef.current.offset.set(amt, amt * 0.6);
    }
  });

  if (tier === "low") {
    // Mobile / no-WebGL-budget: grain + vignette only, no blur/CA/bloom.
    return (
      <EffectComposer>
        <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.18} />
        <Vignette eskil={false} offset={0.45} darkness={0.45} />
      </EffectComposer>
    );
  }

  // Note: every EffectComposer child must be a real effect element — no
  // Fragments / null, or the composer tries to attach a non-effect and throws.
  // So the two tiers are spelled out as separate static trees.
  if (tier === "high") {
    return (
      <EffectComposer multisampling={0}>
        <FocusBlur ref={focusRef} />
        <ChromaticAberration ref={caRef} offset={caOffset} radialModulation={false} modulationOffset={0} />
        <Bloom intensity={0.42} luminanceThreshold={0.6} luminanceSmoothing={0.25} mipmapBlur />
        <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.14} />
        <Vignette eskil={false} offset={0.4} darkness={0.5} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={0}>
      <FocusBlur ref={focusRef} />
      <ChromaticAberration ref={caRef} offset={caOffset} radialModulation={false} modulationOffset={0} />
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.16} />
      <Vignette eskil={false} offset={0.4} darkness={0.5} />
    </EffectComposer>
  );
}
