"use client";

import { useEffect, useRef } from "react";
import { stage, damp } from "@/lib/stage";
import { useDevice } from "@/lib/useDevice";

/**
 * The name — one persistent DOM element, rendered crisp in a cool display grotesk
 * (real text for SEO + screen readers) and racked between blur/sharp via GPU CSS.
 *
 * It's also the hero's interactive centrepiece:
 *   • a neon "spotlight" gradient (clipped to the glyphs) tracks the cursor, so the
 *     letters under the pointer light up — the colour animation IS the interaction;
 *   • a magnetic parallax leans the whole wordmark toward the cursor;
 *   • flicking the pointer fast opens a chromatic RGB fringe (the lens reacts).
 *
 * The chromatic split is two tinted clones offset by `--split` (+ the interactive
 * `--isplit`) with opposite signs. `--split` / `--nblur` are tweened by GSAP (the
 * loader racks them in, the scroll timeline drives them); the interactive vars are
 * driven here per-frame and fade out as you leave the hero.
 */
export default function NameLayer() {
  const kinetic = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLHeadingElement>(null);
  // When the WebGL wordmark is active (same condition Scene uses), the DOM name
  // hides in the hero and only re-appears as the shrunk corner logo on scroll.
  // For reduced-motion / low tier it stays the visible hero wordmark.
  const { tier, reducedMotion } = useDevice();
  const has3D = tier !== "low" && !reducedMotion;

  useEffect(() => {
    const root = document.getElementById("ayan-name");
    if (!root) return;
    let raf = 0;
    let tx = 0,
      ty = 0,
      isplit = 0,
      dx = 0,
      dy = 0,
      clock = 0,
      lx = stage.pointer.x,
      ly = stage.pointer.y;

    const tick = () => {
      clock += 0.016;
      // strongest in the hero, fading out as the wordmark shrinks to the corner
      const heroAmt = Math.max(0, Math.min(1, 1 - stage.progress * 7));

      // pointer velocity → chromatic fringe
      const vx = stage.pointer.x - lx;
      const vy = stage.pointer.y - ly;
      lx = stage.pointer.x;
      ly = stage.pointer.y;
      const speed = Math.min(1, Math.hypot(vx, vy) * 9);
      isplit = damp(isplit, speed * 14 * heroAmt, 6, 0.016);

      // magnetic parallax of the whole wordmark
      tx = damp(tx, stage.pointer.x * 18 * heroAmt, 4, 0.016);
      ty = damp(ty, stage.pointer.y * -12 * heroAmt, 4, 0.016);

      // 3D extrusion direction: a light that follows the cursor (so the depth
      // swings as you move) over a slow idle drift + a grounded downward bias.
      const idleX = Math.cos(clock * 0.5) * 1.6;
      const idleY = Math.sin(clock * 0.42) * 1.0;
      dx = damp(dx, (idleX - stage.pointer.x * 7) * heroAmt, 5, 0.016);
      dy = damp(dy, (5 + idleY - stage.pointer.y * 3) * heroAmt, 5, 0.016);

      if (kinetic.current) {
        kinetic.current.style.transform = `translate(${tx}px, ${ty}px)`;
        // Clean handoff: with the 3D particle wordmark active, the DOM name stays
        // fully hidden until the particles have dissolved (~progress 0.12), then it
        // fades in as it settles into the corner — so the two names are NEVER both
        // on screen at once. Without a 3D wordmark the DOM name IS the hero name.
        kinetic.current.style.opacity = has3D
          ? String(Math.max(0, Math.min(1, (stage.progress - 0.12) / 0.06)))
          : "1";
      }
      root.style.setProperty("--isplit", isplit.toFixed(2) + "px");
      if (base.current) {
        base.current.style.setProperty("--dx", dx.toFixed(2));
        base.current.style.setProperty("--dy", dy.toFixed(2));
      }

      // neon spotlight position, mapped into the wordmark's box
      if (base.current) {
        const r = base.current.getBoundingClientRect();
        if (r.width > 0) {
          const cxPx = (stage.pointer.x * 0.5 + 0.5) * window.innerWidth;
          const cyPx = (1 - (stage.pointer.y * 0.5 + 0.5)) * window.innerHeight;
          const mx = ((cxPx - r.left) / r.width) * 100;
          const my = ((cyPx - r.top) / r.height) * 100;
          base.current.style.setProperty("--mx", mx.toFixed(1) + "%");
          base.current.style.setProperty("--my", my.toFixed(1) + "%");
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [has3D]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-center"
      style={{ willChange: "transform" }}
    >
      <div
        id="ayan-name"
        className="relative"
        style={
          {
            // initial defocused state; loader racks these to 0
            ["--split" as string]: "9px",
            ["--isplit" as string]: "0px",
            ["--nblur" as string]: "26px",
            filter: "blur(var(--nblur))",
            willChange: "transform, filter",
            transformOrigin: "center center",
          } as React.CSSProperties
        }
      >
        <div ref={kinetic} className="name-kinetic">
          {/* chromatic clones */}
          <span
            aria-hidden
            className="name-word name-clone"
            style={{
              color: "#ff2d4d",
              transform: "translateX(calc((var(--split) + var(--isplit)) * -1))",
            }}
          >
            AYAN HORE
          </span>
          <span
            aria-hidden
            className="name-word name-clone"
            style={{
              color: "#19d3ff",
              transform: "translateX(calc(var(--split) + var(--isplit)))",
            }}
          >
            AYAN HORE
          </span>
          {/* the real, readable text — neon spotlight tracks the cursor */}
          <h1 ref={base} className="name-word name-base">
            AYAN HORE
          </h1>
        </div>
      </div>

      <style>{`
        #ayan-name .name-kinetic {
          display: grid;
          place-items: center;
          will-change: transform;
        }
        #ayan-name .name-word {
          grid-area: 1 / 1;
          white-space: nowrap;
          text-align: center;
          font-family: "Bricolage Grotesque", var(--font-display), sans-serif;
          font-weight: 800;
          /* lower floor so the nowrap "AYAN HORE" never clips its edges on a
             ~320px phone, while the 12rem ceiling keeps it grand on desktop */
          font-size: clamp(2.6rem, 12vw, 12rem);
          line-height: 0.9;
          letter-spacing: -0.04em;
        }
        #ayan-name .name-clone { opacity: 0.85; z-index: 1; }
        #ayan-name .name-base {
          z-index: 2;
          position: relative;
          /* the LOGO colour: a living brass↔ice↔paper sheen that flows across the
             letters forever, with the cursor sliding a brighter spotlight over it */
          background-image:
            radial-gradient(
              140% 220% at var(--mx, 50%) var(--my, 42%),
              rgba(255, 255, 255, 0.9) 0%,
              rgba(255, 255, 255, 0) 26%
            ),
            linear-gradient(
              100deg,
              #ece9e1 0%,
              #e8c77a 13%,
              #ffffff 26%,
              #8be8ff 40%,
              #5fc6ff 50%,
              #ffffff 64%,
              #e8c77a 80%,
              #ece9e1 100%
            );
          background-size: 100% 100%, 280% 100%;
          background-repeat: no-repeat;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: name-flow 8s linear infinite, name-glow 4.5s ease-in-out infinite;
          /* bright, luminous wordmark — a thin dark grounding for crisp edges on
             any background, the colour/glow does the rest (no dark 3D block) */
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }
        /* the flowing sheen — only the 2nd background layer (the linear) scrolls;
           the radial spotlight stays put under the cursor */
        @keyframes name-flow {
          to { background-position: 0 0, 280% 0; }
        }
        /* a glow that breathes from brass to ice — the "animated colour" that also
           lifts the logo off a dark background so it reads clearly */
        @keyframes name-glow {
          0%, 100% { filter: drop-shadow(0 0 16px rgba(232, 199, 122, 0.5)); }
          50% { filter: drop-shadow(0 0 32px rgba(139, 232, 255, 0.62)); }
        }
        @media (prefers-reduced-motion: reduce) {
          #ayan-name .name-base { animation: none; }
        }
      `}</style>
    </div>
  );
}
