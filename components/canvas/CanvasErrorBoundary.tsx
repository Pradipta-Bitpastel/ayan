"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { failed: boolean; retries: number };

/**
 * Guards the WebGL canvas. @react-three/postprocessing's EffectComposer can throw
 * on first paint when the GL context isn't ready or is momentarily lost (a
 * StrictMode double-mount race, a context-loss blip) — it reads getContextAttributes()
 * which returns null, surfacing as "Cannot read properties of null (reading 'alpha')".
 *
 * Rather than let that crash the whole page, we catch it, retry the mount a couple
 * of times (transient races usually clear), and finally fall back to the static CSS
 * darkroom backdrop — the site is fully usable without the canvas.
 */
export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, retries: 0 };
  private timer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch() {
    if (this.state.retries < 2) {
      const next = this.state.retries + 1;
      this.timer = setTimeout(
        () => this.setState({ failed: false, retries: next }),
        140
      );
    }
  }

  componentWillUnmount() {
    if (this.timer) clearTimeout(this.timer);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    // key forces a fresh subtree (new Canvas) on each retry
    return (
      <span key={this.state.retries} style={{ display: "contents" }}>
        {this.props.children}
      </span>
    );
  }
}
