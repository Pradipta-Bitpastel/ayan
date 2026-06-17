"use client";

/**
 * Six full-bleed scenes inside the single pinned frame. Headlines are animated
 * gradient text; reveals are whole-element masked wipes (so the gradient stays
 * intact) plus soft fades. No horizontal padding beyond a small safe gutter —
 * content bleeds to the edges. The "Captured Light" scene carries text only; the
 * portrait that develops beside it is rendered in WebGL (Portrait3D).
 */

function Plate({ children }: { children: React.ReactNode }) {
  return (
    <span className="t-mono" style={{ color: "var(--brass)" }}>
      {children}
    </span>
  );
}

function Reveal({
  children,
  className = "",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="reveal-wrap" {...rest}>
      <div data-reveal className={className}>
        {children}
      </div>
    </div>
  );
}

export default function Scenes() {
  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section id="scene-hero" className="scene" aria-label="Ayan Hore — introduction">
        <div className="scene-inner hero-inner" style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: "8vh", textAlign: "center" }}>
          <p className="t-mono scroll-cue" style={{ color: "var(--paper-dim)", opacity: 0.7 }}>
            Scroll — focus pull ↓
          </p>
        </div>
      </section>

      {/* ── ABOUT ────────────────────────────────────────────── */}
      <section id="scene-about" className="scene" aria-label="About">
        <div className="scene-inner">
          <Plate>01 — The Thesis</Plate>
          <div className="mt-6">
            <Reveal className="t-display-l grad-text">I build products.</Reveal>
            <Reveal className="t-display-l grad-text">I photograph light.</Reveal>
          </div>
          <p className="t-heading mt-6" data-fade style={{ color: "var(--paper)", maxWidth: "28ch" }}>
            Same discipline — different lens.
          </p>
          <p className="t-body mt-8" style={{ color: "var(--paper-dim)", maxWidth: "52ch" }} data-fade>
            A thought leader in product development and digital transformation, and
            an artist behind the camera. The same eye that frames a system frames a
            photograph: precision applied to light, structure, and the moment
            everything resolves.
          </p>
        </div>
      </section>

      {/* ── BITPASTEL ────────────────────────────────────────── */}
      <section id="scene-bitpastel" className="scene" aria-label="Bitpastel">
        <div className="scene-inner">
          <Plate>02 — The Company</Plate>
          <Reveal className="t-display-xl grad-text">
            Bitpastel
            <span
              style={{
                WebkitTextFillColor: "var(--brass)",
                fontSize: "0.3em",
                verticalAlign: "super",
                marginLeft: "0.04em",
              }}
            >
              ®
            </span>
          </Reveal>
          <div className="mt-8 flex flex-wrap gap-x-16 gap-y-5" data-fade>
            <div>
              <Plate>Role</Plate>
              <p className="t-heading mt-1">CEO &amp; Co-founder</p>
            </div>
            <div>
              <Plate>Focus</Plate>
              <p className="t-heading mt-1">Product · Digital Transformation</p>
            </div>
          </div>
          <p className="t-body mt-8" style={{ color: "var(--paper-dim)", maxWidth: "54ch" }} data-fade>
            An IT services company building web and mobile products for startups and
            enterprises. I own the vision, the strategy, and operational excellence —
            turning ambiguous problems into shipped systems.
          </p>
          <a
            href="https://bitpastel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="link-draw t-mono mt-8"
            data-cursor="link"
            data-cursor-label="VISIT"
            data-fade
            style={{ color: "var(--brass)" }}
          >
            bitpastel.com →
          </a>
        </div>
      </section>

      {/* ── RECOGNITION ──────────────────────────────────────── */}
      <section id="scene-recognition" className="scene" aria-label="Recognition">
        <div className="scene-inner">
          <Plate>03 — Recognition</Plate>
          <div className="mt-10 flex flex-wrap gap-x-24 gap-y-12">
            <div data-fade style={{ maxWidth: "32ch" }}>
              <p className="t-display-l grad-text">MBA</p>
              <p className="t-body mt-3" style={{ color: "var(--paper-dim)" }}>
                Symbiosis International University
              </p>
            </div>
            <div data-fade style={{ maxWidth: "36ch" }}>
              <p className="t-display-l grad-text">AFIP</p>
              <p className="t-body mt-3" style={{ color: "var(--paper-dim)" }}>
                Associate of the Federation of Indian Photography — an artistic
                distinction in photographic craft.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONNECT ──────────────────────────────────────────── */}
      <section id="scene-connect" className="scene" aria-label="Connect">
        <div className="scene-inner">
          <Plate>04 — Connect</Plate>
          <div className="mt-6">
            <Reveal className="t-display-l grad-text">Let&rsquo;s make</Reveal>
            <Reveal className="t-display-l grad-text">something in focus.</Reveal>
          </div>
          <p className="t-body mt-7" style={{ color: "var(--paper-dim)", maxWidth: "44ch" }} data-fade>
            A product, a portrait, a frame worth keeping — reach out through any of
            these.
          </p>
          <ul className="connect-list mt-9" aria-label="Contact and social links" data-fade>
            {[
              ["01", "Email", "ayan@bitpastel.com", "mailto:ayan@bitpastel.com", "WRITE"],
              ["02", "AyaN Photography", "ayan.photography", "https://ayan.photography", "OPEN"],
              ["03", "LinkedIn", "/ayanhore", "https://www.linkedin.com/", "OPEN"],
              ["04", "Instagram", "@ayan.frames", "https://www.instagram.com/", "OPEN"],
              ["05", "X / Twitter", "@ayanhore", "https://x.com/", "OPEN"],
            ].map(([idx, label, handle, href, cue]) => (
              <li key={label}>
                <a
                  className="connect-row"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cursor="link"
                  data-cursor-label={cue}
                >
                  <span className="connect-idx t-mono">{idx}</span>
                  <span className="connect-label">{label}</span>
                  <span className="connect-handle t-mono">{handle}</span>
                  <span className="connect-arrow" aria-hidden>
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="t-mono connect-foot" data-fade>
            © 2026 Ayan Hore · Shot on the same camera.
          </p>
        </div>
      </section>
    </>
  );
}
