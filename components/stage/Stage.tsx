"use client";

import { useRef } from "react";
import { gsap, useGSAP, registerGsap, ScrollTrigger } from "@/lib/gsap";
import { stage } from "@/lib/stage";
import Scenes from "./Scenes";

const ORDER = [
  "hero",
  "about",
  "bitpastel",
  "recognition",
  "connect",
] as const;

const HOLD: Record<string, number> = {
  hero: 0.6,
  about: 1.0,
  bitpastel: 1.0,
  recognition: 1.0,
  connect: 1.0,
};
const TDUR = 0.75;

/**
 * Per-section entrance choreography. Each scene resolves out of a DIFFERENT
 * gesture so the sequence never reads as one repeated transition: a soft
 * focus-pull, an architectural lateral wipe, an aperture bloom, a slow editorial
 * rise, a warm lift from depth. Kept to compositor-friendly props
 * (transform / filter / opacity / clip-path) so every variant holds 60fps.
 */
type Variant = {
  setR: gsap.TweenVars;
  toR: gsap.TweenVars;
  stagR: number;
  durR: number;
  setF: gsap.TweenVars;
  toF: gsap.TweenVars;
  stagF: number;
  durF: number;
};

const TO_R = { opacity: 1, y: 0, x: 0, scale: 1, filter: "blur(0px)" };
const TO_F = { opacity: 1, y: 0, x: 0, scale: 1, filter: "blur(0px)" };

const REVEAL: Record<string, Variant> = {
  // hero carries no marked reveals, but keep a sane default.
  hero: {
    setR: { opacity: 0, y: 30, filter: "blur(12px)" }, toR: { ...TO_R, ease: "rack" }, stagR: 0.1, durR: 1,
    setF: { opacity: 0, y: 20, filter: "blur(10px)" }, toF: { ...TO_F, ease: "rack" }, stagF: 0.08, durF: 0.85,
  },
  // 01 — soft focus-pull (the signature: everything resolves out of fog)
  about: {
    setR: { opacity: 0, y: 44, filter: "blur(20px)" }, toR: { ...TO_R, ease: "rack" }, stagR: 0.12, durR: 1.05,
    setF: { opacity: 0, y: 24, filter: "blur(12px)" }, toF: { ...TO_F, ease: "rack" }, stagF: 0.08, durF: 0.85,
  },
  // 02 — architectural lateral wipe (lines slide + unmask from the left)
  bitpastel: {
    setR: { opacity: 0, x: -90, filter: "blur(14px)", clipPath: "inset(0% 100% 0% 0%)" },
    toR: { ...TO_R, clipPath: "inset(0% 0% 0% 0%)", ease: "rack" }, stagR: 0.15, durR: 1.1,
    setF: { opacity: 0, x: -44, filter: "blur(10px)" }, toF: { ...TO_F, ease: "rack" }, stagF: 0.1, durF: 0.9,
  },
  // 03 — slow editorial rise (grand, deliberate, settles late)
  recognition: {
    setR: { opacity: 0, y: 84, filter: "blur(12px)" }, toR: { ...TO_R, ease: "power3.out" }, stagR: 0.2, durR: 1.3,
    setF: { opacity: 0, y: 42, filter: "blur(10px)" }, toF: { ...TO_F, ease: "power3.out" }, stagF: 0.14, durF: 1.05,
  },
  // 05 — warm lift from depth (rises and eases back to scale)
  connect: {
    setR: { opacity: 0, y: 36, scale: 1.08, filter: "blur(18px)", transformOrigin: "left bottom" },
    toR: { ...TO_R, ease: "rack" }, stagR: 0.12, durR: 1.1,
    setF: { opacity: 0, y: 22, filter: "blur(12px)" }, toF: { ...TO_F, ease: "rack" }, stagF: 0.09, durF: 0.9,
  },
};

/**
 * Per-scene portrait move. He develops in once (handled inline), then each scene
 * change re-composes him differently: a lateral dolly, a step forward, a pull-
 * back to reveal context, and finally a drift into ambient presence on Connect.
 */
const portraitMove = (
  tl: gsap.core.Timeline,
  el: HTMLElement,
  at: number,
  key: string
) => {
  switch (key) {
    case "bitpastel": // lateral dolly across the frame
      tl.to(el, { xPercent: 5, filter: "blur(13px)", scale: 1.02, duration: TDUR * 0.5, ease: "power2.in" }, at);
      tl.to(el, { xPercent: 0, filter: "blur(0px)", scale: 1, duration: TDUR * 0.85, ease: "rack" }, at + TDUR * 0.45);
      break;
    case "recognition": // camera pulls back to reveal context
      tl.to(el, { filter: "blur(11px)", scale: 1.07, duration: TDUR * 0.45, ease: "power2.in" }, at);
      tl.to(el, { filter: "blur(0px)", scale: 0.97, duration: TDUR * 0.9, ease: "rack" }, at + TDUR * 0.45);
      break;
    case "connect": // drifts up + softens into an ambient presence
      tl.to(el, { filter: "blur(9px)", scale: 0.97, duration: TDUR * 0.4, ease: "power2.in" }, at);
      tl.to(el, { filter: "blur(2px)", scale: 1, autoAlpha: 0.6, yPercent: -3, duration: TDUR * 0.95, ease: "rack" }, at + TDUR * 0.45);
      break;
    default: // soft rack
      tl.to(el, { filter: "blur(10px)", scale: 1.025, duration: TDUR * 0.45, ease: "power2.in" }, at);
      tl.to(el, { filter: "blur(0px)", scale: 1, duration: TDUR * 0.7, ease: "rack" }, at + TDUR * 0.45);
  }
};

export default function Stage({ ready }: { ready: boolean }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ready) return;
      registerGsap();

      const scenes = ORDER.map(
        (k) => document.getElementById(`scene-${k}`) as HTMLElement
      );
      if (scenes.some((s) => !s)) return;
      const nameEl = document.getElementById("ayan-name") as HTMLElement;
      const portraitEl = document.getElementById("portrait") as HTMLElement | null;

      // Each scene arrives via its own variant — blurred + offset in its own
      // direction, resolving as it lands.
      const setInitial = (s: HTMLElement, key: string) => {
        const v = REVEAL[key] ?? REVEAL.about;
        const r = s.querySelectorAll("[data-reveal]");
        const f = s.querySelectorAll("[data-fade]");
        if (r.length) gsap.set(r, v.setR);
        if (f.length) gsap.set(f, v.setF);
      };
      const reveal = (s: HTMLElement, at: number, tl: gsap.core.Timeline, key: string) => {
        const v = REVEAL[key] ?? REVEAL.about;
        const r = s.querySelectorAll("[data-reveal]");
        if (r.length)
          tl.to(r, { ...v.toR, duration: TDUR * v.durR, stagger: v.stagR }, at);
        const f = s.querySelectorAll("[data-fade]");
        if (f.length)
          tl.to(f, { ...v.toF, duration: TDUR * v.durF, stagger: v.stagF }, at + 0.14);
      };

      const mm = gsap.matchMedia();

      /* ── DESKTOP: one pinned frame, scroll racks scene → scene ─────────── */
      mm.add(
        "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
        () => {
          frame.current?.classList.remove("is-flow");

          gsap.set(scenes.slice(1), {
            autoAlpha: 0,
            filter: "blur(16px)",
            scale: 1.08,
            yPercent: 6,
            pointerEvents: "none",
          });
          gsap.set(scenes[0], { autoAlpha: 1, filter: "blur(0px)", scale: 1 });
          scenes.forEach((s, i) => setInitial(s, ORDER[i]));

          // Ayan starts off-frame to the right, defocused.
          if (portraitEl)
            gsap.set(portraitEl, { autoAlpha: 0, scale: 1.06, xPercent: 12, filter: "blur(22px)" });

          const tl = gsap.timeline({ paused: true });
          reveal(scenes[0], 0, tl, "hero");
          tl.to("#scene-hero .scroll-cue", { opacity: 0, duration: 0.3 }, 0.5);

          let pos = HOLD.hero;
          let firstAt = pos;

          for (let i = 1; i < ORDER.length; i++) {
            const key = ORDER[i];
            const prev = scenes[i - 1];
            const cur = scenes[i];
            const at = pos;
            if (i === 1) firstAt = at;
            tl.to(stage, { focus: 0.85, duration: TDUR * 0.5, ease: "power2.in" }, at);
            tl.to(
              prev,
              { autoAlpha: 0, filter: "blur(18px)", scale: 0.94, yPercent: -6, duration: TDUR * 0.6, ease: "power2.in" },
              at
            );
            tl.set(prev, { pointerEvents: "none" }, at + TDUR * 0.6);
            tl.fromTo(
              cur,
              { autoAlpha: 0, filter: "blur(18px)", scale: 1.08, yPercent: 6 },
              { autoAlpha: 1, filter: "blur(0px)", scale: 1, yPercent: 0, pointerEvents: "auto", duration: TDUR * 0.75, ease: "rack" },
              at + TDUR * 0.35
            );
            tl.to(stage, { focus: 0, duration: TDUR * 0.6, ease: "rack" }, at + TDUR * 0.45);
            reveal(cur, at + TDUR * 0.45, tl, key);

            // Ayan: develop in on the first transition, then re-compose with a
            // scene-specific move every following change so he feels freshly
            // framed rather than running the same rack each time.
            if (portraitEl) {
              if (i === 1) {
                tl.to(
                  portraitEl,
                  { autoAlpha: 1, scale: 1, xPercent: 0, filter: "blur(0px)", duration: TDUR * 1.3, ease: "rack" },
                  at + TDUR * 0.3
                );
              } else {
                portraitMove(tl, portraitEl, at, key);
              }
            }

            pos += TDUR + HOLD[key];
          }

          // The name: centre hero wordmark → settles into the tiny corner logo and
          // stays there. (It used to fly back in big on Connect, which collided
          // with the contact list and clipped the final "R".)
          if (nameEl) {
            tl.to(
              nameEl,
              { scale: 0.16, x: () => -(window.innerWidth / 2) + 130, y: () => -(window.innerHeight / 2) + 56, duration: TDUR, ease: "rack" },
              firstAt
            );
          }

          const total = pos;
          ScrollTrigger.create({
            animation: tl,
            trigger: wrapper.current,
            start: "top top",
            end: () => "+=" + total * window.innerHeight * 0.72,
            pin: frame.current,
            scrub: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              stage.progress = self.progress;
            },
          });
          ScrollTrigger.refresh();
        }
      );

      /* ── MOBILE / REDUCED MOTION: vertical flow, quiet reveals ─────────── */
      mm.add("(max-width: 1023px), (prefers-reduced-motion: reduce)", () => {
        frame.current?.classList.add("is-flow");
        const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

        const prog = ScrollTrigger.create({
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          onUpdate: (self) => (stage.progress = self.progress),
        });
        // Ayan as a faint persistent backdrop on mobile (text stays readable).
        if (portraitEl) {
          gsap.set(portraitEl, { autoAlpha: 0, scale: 1.05, filter: "blur(16px)" });
          gsap.to(portraitEl, {
            autoAlpha: reduced ? 0.42 : 0.5,
            scale: 1,
            filter: "blur(0px)",
            ease: "none",
            scrollTrigger: { trigger: scenes[0], start: "top top", end: "bottom top", scrub: true },
          });
        }

        if (reduced) return () => prog.kill();

        if (nameEl)
          gsap.to(nameEl, {
            scale: 0.6,
            autoAlpha: 0,
            ease: "none",
            scrollTrigger: { trigger: scenes[0], start: "top top", end: "bottom top", scrub: true },
          });

        scenes.forEach((s, i) => {
          const key = ORDER[i];
          const v = REVEAL[key] ?? REVEAL.about;
          setInitial(s, key);
          const r = s.querySelectorAll("[data-reveal]");
          if (r.length)
            gsap.to(r, {
              ...v.toR,
              duration: v.durR * 1.1,
              stagger: v.stagR,
              scrollTrigger: { trigger: s, start: "top 80%" },
            });
          const f = s.querySelectorAll("[data-fade]");
          if (f.length)
            gsap.to(f, {
              ...v.toF,
              duration: v.durF * 1.05,
              stagger: v.stagF,
              scrollTrigger: { trigger: s, start: "top 74%" },
            });
        });
        return () => prog.kill();
      });

      return () => mm.revert();
    },
    { dependencies: [ready], scope: wrapper }
  );

  return (
    <div ref={wrapper} className="relative z-10">
      <div ref={frame} className="stage-frame">
        <Scenes />
      </div>
    </div>
  );
}
