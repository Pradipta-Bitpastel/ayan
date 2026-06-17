"use client";

import { useMemo, useRef } from "react";
import { gsap, useGSAP, registerGsap } from "@/lib/gsap";
import { stage } from "@/lib/stage";
import { useDevice } from "@/lib/useDevice";

/**
 * The name fills with light like water rising through glass. "AYAN HORE" sits as
 * an empty engraved outline; a luminous liquid (a fixed ice→brass depth gradient
 * revealed by a live, wavy rising surface) floods up through the letters while a
 * mono readout counts. When it tops out the plate irises open and the world racks
 * from defocus into focus — the liquid name dissolving exactly as the hero's name
 * reassembles out of light. From here on it plays as one continuous shot.
 */

const VB_W = 1100;
const VB_H = 340;
const FONT = 188;
const LETTER_TOP = 64;
const LETTER_BOT = 268;
const AMP = 17;

/** A filled wave: a sine crest on top flooding down to `depth`. Built wider than
 *  the frame so a horizontal loop of exactly one wavelength is seamless. */
function wavePath(amp: number, wavelength: number, width: number, depth: number) {
  const step = wavelength / 20;
  let d = `M 0 ${depth} L 0 0`;
  for (let x = 0; x <= width; x += step) {
    const y = -amp * Math.cos((x / wavelength) * Math.PI * 2);
    d += ` L ${x.toFixed(1)} ${y.toFixed(2)}`;
  }
  d += ` L ${width} ${depth} Z`;
  return d;
}
/** Just the crest line (no flood), for the luminous surface highlight. */
function crestLine(amp: number, wavelength: number, width: number) {
  const step = wavelength / 20;
  let d = `M 0 ${(-amp).toFixed(2)}`;
  for (let x = 0; x <= width; x += step) {
    const y = -amp * Math.cos((x / wavelength) * Math.PI * 2);
    d += ` L ${x.toFixed(1)} ${y.toFixed(2)}`;
  }
  return d;
}

export default function Loader({ onComplete }: { onComplete: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const ui = useRef<HTMLDivElement>(null);
  const waterMask = useRef<SVGGElement>(null);
  const crestY = useRef<SVGGElement>(null);
  const waveFill = useRef<SVGPathElement>(null);
  const crestPath = useRef<SVGPathElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const { reducedMotion } = useDevice();

  const shapes = useMemo(
    () => ({
      flood: wavePath(AMP, 360, 2160, 760),
      crest: crestLine(AMP, 360, 2160),
    }),
    []
  );

  // Surface travel, in viewBox units: from below the glyphs (DRY) to above (FULL).
  const DRY = LETTER_BOT + AMP + 14;
  const FULL = LETTER_TOP - AMP - 26;

  useGSAP(
    () => {
      registerGsap();
      const nameEl = document.getElementById("ayan-name") as HTMLElement | null;
      const finish = () => {
        stage.ready = true;
        onComplete();
      };

      const setLevel = (v: number) => {
        const y = (DRY + (FULL - DRY) * v).toFixed(1);
        waterMask.current?.setAttribute("transform", `translate(0, ${y})`);
        crestY.current?.setAttribute("transform", `translate(0, ${y})`);
      };
      setLevel(0);

      const fontsReady =
        typeof document !== "undefined" && "fonts" in document
          ? (document as Document).fonts.ready
          : Promise.resolve();
      let proceeded = false;
      const proceed = () => {
        if (proceeded) return;
        proceeded = true;
        run();
      };
      const ceiling = window.setTimeout(proceed, 5200);
      const floor = new Promise<void>((r) => window.setTimeout(r, 2200));
      Promise.all([fontsReady, floor]).then(() => {
        clearTimeout(ceiling);
        proceed();
      });

      // The flood rising through the letters, readout climbing with it.
      const fill = { v: 0 };
      gsap.to(fill, {
        v: 0.92,
        duration: 2.3,
        ease: "power1.inOut",
        onUpdate: () => {
          setLevel(fill.v);
          if (readout.current)
            readout.current.textContent = `DEVELOPING · ${String(Math.round(fill.v * 100)).padStart(3, "0")}%`;
        },
      });

      // Living water: the surface drifts horizontally on a seamless loop.
      const drift = reducedMotion
        ? []
        : [
            gsap.to(waveFill.current, { x: -360, duration: 3.0, ease: "none", repeat: -1 }),
            gsap.to(crestPath.current, { x: -360, duration: 3.0, ease: "none", repeat: -1 }),
          ];

      function run() {
        if (reducedMotion) {
          setLevel(1);
          stage.focus = 0;
          if (nameEl) gsap.set(nameEl, { "--split": "0px", "--nblur": "0px" });
          gsap.set(root.current, { "--iris": "160%" });
          if (readout.current) readout.current.textContent = "f/1.4 · IN FOCUS";
          gsap.to(root.current, { autoAlpha: 0, duration: 0.6, onComplete: finish });
          return;
        }

        const tl = gsap.timeline({
          onComplete: () => {
            drift.forEach((t) => t.kill());
            finish();
          },
        });
        // top the flood off, then the liquid name swells + dissolves as the iris
        // opens and the world racks into focus.
        tl.to(fill, { v: 1, duration: 0.45, ease: "power2.out", onUpdate: () => setLevel(fill.v) }, 0)
          .to(readout.current, { autoAlpha: 0, duration: 0.4 }, 0.2)
          .to(ui.current, { scale: 1.06, autoAlpha: 0, filter: "blur(16px)", duration: 0.95, ease: "power2.in" }, 0.35)
          .to(root.current, { "--iris": "165%", duration: 1.5, ease: "rack" }, 0.5)
          .to(stage, { focus: 0, duration: 1.15, ease: "rack" }, 0.85);
        if (nameEl) {
          tl.fromTo(
            nameEl,
            { scale: 1.05 },
            { "--split": "0px", "--nblur": "0px", scale: 1.0, duration: 1.15, ease: "rack" },
            0.85
          );
        }
      }
    },
    { dependencies: [reducedMotion], scope: root }
  );

  const textProps = {
    x: VB_W / 2,
    y: VB_H / 2,
    textAnchor: "middle" as const,
    dominantBaseline: "central" as const,
    fontFamily: "'Bricolage Grotesque', 'Clash Display', sans-serif",
    fontWeight: 800,
    fontSize: FONT,
    letterSpacing: "-7",
  };

  return (
    <div
      ref={root}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={
        {
          background: "var(--ink-900)",
          ["--iris" as string]: "0%",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 50%, transparent var(--iris), #000 calc(var(--iris) + 1.2%))",
          maskImage:
            "radial-gradient(circle at 50% 50%, transparent var(--iris), #000 calc(var(--iris) + 1.2%))",
        } as React.CSSProperties
      }
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(120% 80% at 50% 46%, rgba(139,232,255,0.07), transparent 60%), radial-gradient(90% 70% at 50% 62%, rgba(201,162,75,0.06), transparent 70%)",
        }}
      />

      <div ref={ui} className="relative flex flex-col items-center gap-7" style={{ willChange: "transform, filter, opacity" }}>
        <svg
          width="min(84vw, 780px)"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          role="img"
          aria-label="Ayan Hore"
          style={{ overflow: "visible", display: "block" }}
        >
          <defs>
            {/* fixed depth colour of the liquid — ice near the surface, brass deep */}
            <linearGradient id="liquid" gradientUnits="userSpaceOnUse" x1="0" y1={LETTER_TOP} x2="0" y2={LETTER_BOT}>
              <stop offset="0%" stopColor="#f2fcff" />
              <stop offset="22%" stopColor="#a8edff" />
              <stop offset="48%" stopColor="#54c2e8" />
              <stop offset="72%" stopColor="#2f86b4" />
              <stop offset="90%" stopColor="#8a7a52" />
              <stop offset="100%" stopColor="#d4ad55" />
            </linearGradient>
            <clipPath id="nameClip">
              <text {...textProps}>AYAN HORE</text>
            </clipPath>
            {/* the rising, wavy surface that reveals the liquid */}
            <mask id="fillMask" maskUnits="userSpaceOnUse" x="0" y="-240" width={VB_W} height={VB_H + 520}>
              <rect x="0" y="-240" width={VB_W} height={VB_H + 520} fill="black" />
              <g ref={waterMask}>
                <path ref={waveFill} d={shapes.flood} fill="white" />
              </g>
            </mask>
          </defs>

          {/* empty engraved glass letters */}
          <text {...textProps} fill="none" stroke="rgba(180,200,215,0.16)" strokeWidth={1.2}>
            AYAN HORE
          </text>
          {/* a barely-there full ghost so the empty letters read as glass, not gaps */}
          <g clipPath="url(#nameClip)">
            <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#liquid)" opacity={0.1} />
          </g>

          {/* the liquid, clipped to the type, revealed by the rising surface */}
          <g clipPath="url(#nameClip)">
            <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#liquid)" mask="url(#fillMask)" />
          </g>

          {/* luminous surface line riding the crest, clipped to the type */}
          <g clipPath="url(#nameClip)">
            <g ref={crestY}>
              <path
                ref={crestPath}
                d={shapes.crest}
                fill="none"
                stroke="#eafaff"
                strokeWidth={2.5}
                opacity={0.9}
                style={{ filter: "drop-shadow(0 0 7px rgba(139,232,255,0.85))" }}
              />
            </g>
          </g>

          {/* crisp bright edge over the liquid */}
          <text {...textProps} fill="none" stroke="rgba(234,250,255,0.12)" strokeWidth={0.75}>
            AYAN HORE
          </text>
        </svg>

        <span ref={readout} className="t-mono" style={{ color: "var(--paper-dim)", letterSpacing: "0.22em" }}>
          DEVELOPING · 000%
        </span>
      </div>
    </div>
  );
}
