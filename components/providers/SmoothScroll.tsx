"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { registerGsap, gsap, ScrollTrigger } from "@/lib/gsap";
import { stage } from "@/lib/stage";
import { useDevice } from "@/lib/useDevice";

/**
 * Lenis owns smooth scrolling; ScrollTrigger reads from it; the WebGL layer reads
 * the resulting pointer/progress out of the shared `stage`. On reduced-motion we
 * skip Lenis entirely and let the OS scroll natively.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const { reducedMotion, finePointer, tier } = useDevice();

  useEffect(() => {
    registerGsap();
    stage.tier = tier;
  }, [tier]);

  useEffect(() => {
    if (reducedMotion) return;

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });

    lenis.on("scroll", ScrollTrigger.update);
    // expose for programmatic/headless scrolling (harmless dev aid)
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    const raf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, [reducedMotion]);

  // Feed the pointer into the shared stage for parallax + the cursor lens.
  useEffect(() => {
    if (!finePointer) {
      document.body.classList.remove("has-aperture");
      stage.pointer.x = 0;
      stage.pointer.y = 0;
      return;
    }
    document.body.classList.add("has-aperture");
    const onMove = (e: PointerEvent) => {
      stage.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      stage.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      stage.pointerMoved = true;
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.body.classList.remove("has-aperture");
    };
  }, [finePointer]);

  return <>{children}</>;
}
