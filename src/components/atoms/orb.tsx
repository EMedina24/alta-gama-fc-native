/**
 * The thinking orb (ADR 0197) — the Medina kit's loading mark: a dotted 3D
 * orb from `thinking-orbs` (MIT © Jakub Antalik). In-place waiting only —
 * pull-to-refresh, a button that is working, a chip that is searching. Never
 * a full-screen first load (`Skeleton` owns that), and ONE per view.
 *
 * ⚠ Drawn with `react-native-svg`, not the kit's Skia canvas. The engine's
 * `MODE_FRAMES` are pure geometry — a frame is a finished, z-sorted list of
 * dots and lines — so any 2D renderer paints it identically; Skia would have
 * been a native dependency and a dev-client rebuild for a 20pt spinner.
 * Frames are capped at `OrbMotion.fps`: at these sizes 60 re-renders a second
 * buys nothing the eye can see.
 *
 * ⚠ Reduce Motion freezes it on one representative frame (the kit's rule).
 */
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import { MODE_FRAMES, resolvePreset, type OrbFrame } from 'thinking-orbs/engine';

import { Colors, OrbMotion } from '@/constants/theme';

export type OrbState = 'searching' | 'solving' | 'connecting' | 'working';

export interface OrbProps {
  state?: OrbState;
  /** The engine's two hand-tuned designs: 20 inline, 64 standalone. */
  size?: 20 | 64;
  /** `accent` paints the nearest (brightest) dots lime; `ink` is grayscale. */
  tone?: 'ink' | 'accent';
  /**
   * The substrate: `dark` (default — the app is dark-only) draws light ink;
   * `light` draws dark ink, for an orb sitting ON a lime fill.
   */
  on?: 'dark' | 'light';
  /** Spoken as a progress indicator. Callers pass copy; there is no default. */
  accessibilityLabel: string;
}

/** Dots whose ink value is below this read as "near" — the accent's share. */
const ACCENT_NEAR = 0.14;

export function Orb({ state = 'working', size = 20, tone = 'ink', on = 'dark', accessibilityLabel }: OrbProps) {
  const reduced = useReducedMotion();
  const { mode, speed, opts } = useMemo(() => resolvePreset(state, size), [state, size]);
  const build = MODE_FRAMES[mode];
  // The still pose is derived, not set: it is what paints before the first
  // tick and all the time under Reduce Motion.
  const still = useMemo(() => build(size, OrbMotion.still, opts), [build, opts, size]);
  const [live, setLive] = useState<OrbFrame | null>(null);

  useEffect(() => {
    if (reduced) return;
    const start = Date.now();
    const id = setInterval(() => {
      setLive(build(size, OrbMotion.still + ((Date.now() - start) / 1000) * speed, opts));
    }, 1000 / OrbMotion.fps);
    return () => clearInterval(id);
  }, [build, opts, reduced, size, speed]);

  const frame = reduced || !live ? still : live;

  const dark = on === 'dark';
  const ink = (white: number) => {
    const g = Math.round((dark ? 1 - clamp(white) : clamp(white)) * 255);
    return `rgb(${g},${g},${g})`;
  };

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      style={{ width: size, height: size }}>
      <Svg width={size} height={size} pointerEvents="none">
        {frame.lines.map((l, i) => (
          <Line
            key={`l${i}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={ink(l.white)}
            strokeOpacity={l.a ?? 1}
            strokeWidth={l.w}
          />
        ))}
        {frame.dots.map((d, i) => (
          <Circle
            key={`d${i}`}
            cx={d.x}
            cy={d.y}
            r={d.r}
            fill={tone === 'accent' && clamp(d.white) < ACCENT_NEAR ? Colors.dark.accent : ink(d.white)}
            fillOpacity={d.a ?? 1}
          />
        ))}
      </Svg>
    </View>
  );
}

function clamp(v: number) {
  return Math.min(1, Math.max(0, v));
}
