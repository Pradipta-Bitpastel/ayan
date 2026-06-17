"use client";

import { useEffect, useRef } from "react";
import { gsap, registerGsap } from "@/lib/gsap";
import { stage, damp } from "@/lib/stage";

const TAGLINE = ["Where", "light", "holds", "still."];

/**
 * The hero's editorial layer, layered OVER the WebGL particle name. A framing HUD
 * in the corners, a mono kicker above the name and a tagline below it. The reveal
 * is keyed to the focus-rack (it plays AS the world pulls into focus, so it reads
 * as one continuous shot rather than a separate beat that pops in late), and stays
 * subtle: the tagline rises behind a mask, the kicker + HUD simply fade up — no
 * reflow-heavy letter-spacing tween. Everything leans toward the cursor on a gentle
 * multi-rate parallax and the whole layer dissolves as you scroll past it.
 */
export default function HeroOverlay() {
  const root = useRef<HTMLDivElement>(null);
  const kicker = useRef<HTMLParagraphElement>(null);
  const tagWrap = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLHeadingElement>(null);
  const hud = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerGsap();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const words = tag.current?.querySelectorAll<HTMLElement>(".tag-word") ?? [];
    const hudKids = hud.current ? Array.from(hud.current.children) : [];

    // hidden initial state (the kicker's transform is owned by the parallax loop
    // below, so it only ever fades — never a transform tween that would be stomped)
    gsap.set(words, { yPercent: 116 });
    gsap.set([kicker.current, ...hudKids], { autoAlpha: 0 });
    gsap.set(hudKids, { y: -8 });

    let played = false;
    let intro: gsap.core.Timeline | null = null;
    const play = () => {
      if (played) return;
      played = true;
      if (reduced) {
        gsap.set(words, { yPercent: 0 });
        gsap.set([kicker.current, ...hudKids], { autoAlpha: 1, y: 0 });
        return;
      }
      intro = gsap.timeline();
      intro
        .to(words, { yPercent: 0, duration: 0.9, ease: "rack", stagger: 0.08 }, 0)
        .to(kicker.current, { autoAlpha: 1, duration: 0.8, ease: "power2.out" }, 0.05)
        .to(hudKids, { autoAlpha: 1, y: 0, duration: 0.7, ease: "rack", stagger: 0.08 }, 0.12);
    };

    let raf = 0;
    let kx = 0, ky = 0, tx = 0, ty = 0, hx = 0;
    const tick = () => {
      // reveal in lock-step with the rack pulling the hero into focus
      if (!played && (stage.focus < 0.55 || stage.ready)) play();
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
    return () => {
      cancelAnimationFrame(raf);
      intro?.kill();
    };
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
