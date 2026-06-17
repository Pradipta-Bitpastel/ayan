"use client";

import { useEffect, useState } from "react";

export type Device = {
  reducedMotion: boolean;
  finePointer: boolean;
  isMobile: boolean;
  webgl: boolean;
  tier: "high" | "mid" | "low";
};

function detectWebgl(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

const DEFAULT: Device = {
  reducedMotion: false,
  finePointer: true,
  isMobile: false,
  webgl: true,
  tier: "high",
};

/**
 * Single source of truth for "how much can this device take." Used to gate the
 * postprocessing stack, particle counts, the cursor lens and the horizontal pin.
 * Returns sensible SSR defaults, then refines on mount.
 */
export function useDevice(): Device {
  const [device, setDevice] = useState<Device>(DEFAULT);

  useEffect(() => {
    const resolve = () => {
      const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const finePointer = matchMedia("(pointer: fine)").matches;
      const isMobile = matchMedia("(max-width: 639px)").matches;
      const isTablet = matchMedia("(min-width: 640px) and (max-width: 1023px)").matches;
      const webgl = detectWebgl();

      let tier: Device["tier"] = "high";
      if (isMobile || !webgl) tier = "low";
      else if (isTablet) tier = "mid";

      setDevice({ reducedMotion, finePointer, isMobile, webgl, tier });
    };

    resolve();
    const mqs = [
      matchMedia("(prefers-reduced-motion: reduce)"),
      matchMedia("(pointer: fine)"),
      matchMedia("(max-width: 639px)"),
    ];
    mqs.forEach((m) => m.addEventListener("change", resolve));
    return () => mqs.forEach((m) => m.removeEventListener("change", resolve));
  }, []);

  return device;
}
