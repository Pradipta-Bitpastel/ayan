/**
 * Module-level mutable "stage" state.
 *
 * The whole experience is one continuous focus pull, so the WebGL layer and the
 * DOM layer have to stay in lock-step every frame. Rather than route that through
 * React state (which would re-render on every scroll tick), we keep a single
 * mutable object: GSAP / ScrollTrigger write to it, and the R3F render loop reads
 * from it inside useFrame. No re-renders, no jank.
 */
export type StageState = {
  /** 0 = perfectly sharp, 1 = fully defocused. Driven by the loader + scroll. */
  focus: number;
  /** Master scroll progress through the pinned stage, 0 → 1. */
  progress: number;
  /** Normalised pointer, -1..1 on each axis, for parallax + cursor lens. */
  pointer: { x: number; y: number };
  /** True once the user has actually moved the pointer (so effects keyed to the
   *  cursor don't fire at the default 0,0 = dead-centre origin). */
  pointerMoved: boolean;
  /** Loader finished + first paint settled. */
  ready: boolean;
  /** Quality tier resolved from the device. */
  tier: "high" | "mid" | "low";
  /** True once a Spline centrepiece has loaded — the code orb hides as fallback. */
  splineActive: boolean;
};

export const stage: StageState = {
  focus: 1,
  progress: 0,
  pointer: { x: 0, y: 0 },
  pointerMoved: false,
  ready: false,
  tier: "high",
  splineActive: false,
};

/** Linear interpolation helper used all over the render loop. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smooth, framerate-independent damping toward a target. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

/** Remap a value from [inMin,inMax] to [outMin,outMax], clamped. */
export const mapClamp = (
  v: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
) => {
  const t = Math.min(1, Math.max(0, (v - inMin) / (inMax - inMin)));
  return outMin + (outMax - outMin) * t;
};

/**
 * Per-section colour moods. Each entry is [bg, a, b, c] for the flowing gradient
 * backdrop — a dark base rising into a saturated mid and a bright accent. The
 * lens orb borrows the [a,b,c] of each. The whole site lerps between these as
 * you scroll, so the "film" visibly changes temperature scene to scene.
 */
export const PALETTES: [string, string, string, string][] = [
  ["#03050d", "#0a2436", "#1f6f93", "#8be8ff"], // hero — midnight → deep teal → ice (cool, cinematic)
  ["#07161d", "#155f5a", "#2fb6a4", "#86ffe4"], // about — deep teal → aqua
  ["#120a26", "#46208a", "#8f52d8", "#cf9bff"], // bitpastel — indigo → violet
  ["#1a0c04", "#7a3a12", "#e8801e", "#ffce62"], // captured light — amber → gold
  ["#06160f", "#155a3e", "#33b070", "#8effbc"], // recognition — emerald
  ["#140f06", "#6a4a18", "#cc9433", "#f7da80"], // connect — champagne
];
