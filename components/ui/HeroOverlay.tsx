"use client";

import { useEffect, useRef } from "react";
import { gsap, useGSAP, registerGsap } from "@/lib/gsap";
import { stage, damp } from "@/lib/stage";

const TAGLINE = ["Where", "light", "holds", "still."];

/**
 * The hero's editorial layer, layered OVER the WebGL particle name. A framing HUD
 * in the corners, a mono kicker above the name and a tagline below it that reveals
 * word-by-word once the loader hands off. Everything leans toward the cursor on a
 * gentle multi-rate parallax (kicker, tagline and HUD drift by different amounts,
 * so the hero has real depth) and the whole layer dissolves as you scroll past it.
 */
export default function HeroOverlay({ ready }: { ready: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const kicker = useRef<HTMLParagraphElement>(null);
  const tagWrap = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLHeadingElement>(null);
  const hud = useRef<HTMLDivElement>(null);

  // Intro once the loader is done — plays as the name racks into focus.
  useGSAP(
    () => {
      if (!ready) return;
      registerGsap();
      gsap.set(root.current, { autoAlpha: 1 });

      // Manual word reveal: each word keeps its own gradient (background-clip:text
      // breaks if the glyphs are moved into wrapper nodes, as SplitText does).
      const words = tag.current?.querySelectorAll(".tag-word") ?? [];
      const tl = gsap.timeline({ delay: 0.15 });
      if (words.length) {
        gsap.set(words, { yPercent: 118 });
        tl.to(words, { yPercent: 0, duration: 1.1, ease: "rack", stagger: 0.09 }, 0);
      }
      tl.fromTo(
        kicker.current,
        { autoAlpha: 0, y: 14, letterSpacing: "0.5em" },
        { autoAlpha: 1, y: 0, letterSpacing: "0.22em", duration: 1.2, ease: "rack" },
        0.1
      ).fromTo(
        hud.current ? hud.current.children : [],
        { autoAlpha: 0, y: -10 },
        { autoAlpha: 1, y: 0, duration: 1.0, ease: "rack", stagger: 0.12 },
        0.2
      );
    },
    { dependencies: [ready], scope: root }
  );

  // Per-frame: multi-rate cursor parallax + dissolve on scroll.
  useEffect(() => {
    let raf = 0;
    let kx = 0, ky = 0, tx = 0, ty = 0, hx = 0;
    const tick = () => {
      const heroAmt = Math.max(0, Math.min(1, 1 - stage.progress * 8));
      const px = stage.pointer.x;
      const py = stage.pointer.y;
      kx = damp(kx, px * 26 * heroAmt, 4, 0.016);
      ky = damp(ky, py * -16 * heroAmt, 4, 0.016);
      tx = damp(tx, px * 40 * heroAmt, 4, 0.016);
      ty = damp(ty, py * -24 * heroAmt, 4, 0.016);
      hx = damp(hx, px * 12 * heroAmt, 4, 0.016);
      if (kicker.current) kicker.current.style.transform = `translate(${kx}px, ${ky}px)`;
      if (tagWrap.current) tagWrap.current.style.transform = `translate(${tx}px, ${ty}px)`;
      if (hud.current) hud.current.style.transform = `translate(${hx}px, 0)`;
      if (root.current) {
        root.current.style.opacity = String(heroAmt);
        root.current.style.pointerEvents = "none";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={root}
      className="pointer-events-none fixed inset-0 z-20"
      style={{ opacity: 0, willChange: "opacity" }}
      aria-hidden
    >
      {/* corner framing HUD */}
      <div ref={hud}>
        <span
          className="t-mono"
          style={{ position: "absolute", top: "clamp(1.25rem,3vh,2.25rem)", left: "var(--hud-x, clamp(1.25rem,4vw,4.5rem))", color: "var(--paper-dim)" }}
        >
          AYAN&nbsp;HORE
        </span>
        <span
          className="t-mono"
          style={{ position: "absolute", top: "clamp(1.25rem,3vh,2.25rem)", right: "var(--hud-x, clamp(1.25rem,4vw,4.5rem))", color: "var(--brass)" }}
        >
          PORTFOLIO — VOL.01
        </span>
        <span
          className="t-mono"
          style={{ position: "absolute", bottom: "clamp(1.25rem,3vh,2.25rem)", left: "var(--hud-x, clamp(1.25rem,4vw,4.5rem))", color: "var(--paper-dim)" }}
        >
          22.5726° N&nbsp;&nbsp;88.3639° E
        </span>
      </div>

      {/* kicker above the particle name */}
      <p
        ref={kicker}
        className="t-mono"
        style={{
          position: "absolute",
          top: "30%",
          left: 0,
          right: 0,
          textAlign: "center",
          color: "var(--brass-hi)",
          letterSpacing: "0.22em",
          willChange: "transform",
        }}
      >
        AFIP · PHOTOGRAPHER · PRODUCT&nbsp;LEADER
      </p>

      {/* tagline below the name */}
      <div
        ref={tagWrap}
        style={{ position: "absolute", top: "61%", left: 0, right: 0, textAlign: "center", willChange: "transform" }}
      >
        <h2
          ref={tag}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "clamp(1.6rem, 3.4vw, 3rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            display: "inline-block",
          }}
        >
          {TAGLINE.map((w, i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                overflow: "hidden",
                verticalAlign: "bottom",
                paddingBottom: "0.14em",
                marginRight: i < TAGLINE.length - 1 ? "0.28em" : 0,
              }}
            >
              <span className="tag-word grad-text" style={{ display: "inline-block", willChange: "transform" }}>
                {w}
              </span>
            </span>
          ))}
        </h2>
      </div>
    </div>
  );
}
