"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useDevice } from "@/lib/useDevice";

/**
 * The aperture cursor — a brass focus ring + inner dot that trails the pointer on
 * its own eased timing (gsap.quickTo) so it feels like real glass settling. It
 * reads `data-cursor` on hovered elements to change state:
 *   link  → ring expands, label shows
 *   image → "FOCUS" hint
 * Hidden entirely on coarse/touch pointers.
 */
export default function Cursor() {
  const { finePointer, reducedMotion } = useDevice();
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!finePointer || reducedMotion) return;
    const ringEl = ring.current!;
    const dotEl = dot.current!;
    const labelEl = label.current!;

    const rx = gsap.quickTo(ringEl, "x", { duration: 0.45, ease: "rack" });
    const ry = gsap.quickTo(ringEl, "y", { duration: 0.45, ease: "rack" });
    const dx = gsap.quickTo(dotEl, "x", { duration: 0.12, ease: "power2.out" });
    const dy = gsap.quickTo(dotEl, "y", { duration: 0.12, ease: "power2.out" });

    const move = (e: PointerEvent) => {
      rx(e.clientX);
      ry(e.clientY);
      dx(e.clientX);
      dy(e.clientY);
    };

    const setState = (state: string | null, text: string) => {
      labelEl.textContent = text;
      gsap.to(ringEl, {
        scale: state === "link" ? 2.2 : state === "image" ? 3.2 : 1,
        borderColor:
          state === "image" ? "var(--brass-hi)" : "var(--brass)",
        duration: 0.4,
        ease: "rack",
      });
      gsap.to(dotEl, {
        scale: state ? 0.3 : 1,
        duration: 0.4,
        ease: "rack",
      });
      gsap.to(labelEl, { opacity: text ? 1 : 0, duration: 0.3 });
    };

    const over = (e: Event) => {
      const t = (e.target as HTMLElement)?.closest?.("[data-cursor]");
      if (!t) return setState(null, "");
      const kind = t.getAttribute("data-cursor");
      setState(kind, t.getAttribute("data-cursor-label") || "");
    };

    const down = () => gsap.to(ringEl, { scale: "-=0.4", duration: 0.15 });
    const up = () => gsap.to(ringEl, { scale: "+=0.4", duration: 0.3, ease: "rack" });

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerover", over);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    gsap.to([ringEl, dotEl], { opacity: 1, duration: 0.6, delay: 0.2 });

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, [finePointer, reducedMotion]);

  if (!finePointer || reducedMotion) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70]">
      <div
        ref={ring}
        className="absolute left-0 top-0 flex items-center justify-center rounded-full opacity-0"
        style={{
          width: 44,
          height: 44,
          marginLeft: -22,
          marginTop: -22,
          border: "1px solid var(--brass)",
          willChange: "transform",
        }}
      >
        <span
          ref={label}
          className="t-mono absolute opacity-0"
          style={{ fontSize: 5, letterSpacing: "0.12em", color: "var(--brass-hi)" }}
        />
      </div>
      <div
        ref={dot}
        className="absolute left-0 top-0 rounded-full opacity-0"
        style={{
          width: 5,
          height: 5,
          marginLeft: -2.5,
          marginTop: -2.5,
          background: "var(--brass-hi)",
          willChange: "transform",
        }}
      />
    </div>
  );
}
