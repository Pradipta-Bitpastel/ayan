"use client";

import { useEffect, useRef } from "react";
import { stage, damp } from "@/lib/stage";

/**
 * A graded photograph in a fixed frame. The frame itself never moves (so it can
 * never overlap neighbouring content); the image inside is overscanned (114%) and
 * parallaxes on the cursor strictly within that overscan, so its edges never enter
 * the frame — the photo is never visibly cropped at a seam and never spills out.
 * A darkroom grade (duotone + grain + vignette) is applied in CSS so any source
 * reads as one cohesive, intentional body of work.
 */
export default function PhotoFrame({
  src,
  alt,
  depth = 1,
  className = "",
  style,
}: {
  src: string;
  alt: string;
  /** parallax strength multiplier (0 = static) */
  depth?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const img = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let raf = 0;
    let x = 0, y = 0;
    // overscan is 18% (±9% safe). Cap travel below that so an edge can never enter
    // the frame — the photo is never visibly cropped at a seam, whatever the depth.
    const MAX = Math.min(8, 6 * depth);
    const tick = () => {
      x = damp(x, stage.pointer.x * MAX, 3, 0.016);
      y = damp(y, stage.pointer.y * -MAX, 3, 0.016);
      if (img.current)
        img.current.style.transform = `translate(${x.toFixed(2)}%, ${y.toFixed(2)}%)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [depth]);

  return (
    <div className={`photo-frame ${className}`} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={img} src={src} alt={alt} className="photo-frame-img" draggable={false} />
      <span className="photo-frame-grade" aria-hidden />
      <span className="photo-frame-grain" aria-hidden />
      <span className="photo-frame-edge" aria-hidden />
    </div>
  );
}
