/**
 * The mark beside a match event: goal, card, substitution, VAR, missed penalty.
 *
 * ⚠⚠ **The slot is FIXED at `Size.eventGlyphW × Size.eventGlyphH` (18 × 15) for
 * every kind, and must never be sized to the glyph.** A card is 11pt wide and a
 * goal disc 24; sizing to content ragged every player name in the panel. The
 * `viewBox` differs per mark and `preserveAspectRatio` centres each one inside
 * the same box — that is what keeps the names aligned down the timeline
 * whatever the mix of goals, cards and subs.
 *
 * ⚠ **This is the app's first use of `react-native-svg`** (ADR 0045). The
 * package has been a dependency since the start and imported nowhere;
 * `player-photo.tsx` turned it down on PROPORTIONALITY — "a circle over a dome
 * does not justify being its first use" — not on the library. Seven marks
 * including a pentagon inset in a disc do.
 *
 * ⚠ It is a NATIVE module. It autolinks from `package.json`, so no config
 * changes — but a dev client built before it was declared throws at runtime
 * rather than falling back. `/_debug/gallery` is where that is checked first.
 *
 * Paths are transcribed from `handoff_event-expansion/Match Events Spec.dc.html`;
 * every colour comes from `@/constants/theme`, never the spec's hex.
 */
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Colors, Size } from '@/constants/theme';
import type { EventKind } from '@/lib/cronogol/events';

const C = Colors.dark;

/** Three speed trails on the left rim — the mark that says "this went in". */
const TRAILS = 'M1.1 10h4.5M3 6.6h3.4M3 13.4h3.4';
/** The dark pentagon inset in the disc. */
const PENTAGON = 'M15.2 6.1l3.71 2.7-1.42 4.36h-4.58L11.49 8.8z';

export interface EventGlyphProps {
  kind: EventKind;
}

export function EventGlyph({ kind }: EventGlyphProps) {
  const box = { width: Size.eventGlyphW, height: Size.eventGlyphH };

  switch (kind) {
    case 'goal':
      return (
        <Svg {...box} viewBox="0 0 24 20" accessible={false}>
          <Circle cx={15.2} cy={10} r={8} fill={C.accent} />
          <Path d={PENTAGON} fill={C.onAccent} />
          <Path d={TRAILS} stroke={C.accent} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      );

    /**
     * ⚠ Deliberately NOT the scoring side's lime. An own goal counts for the
     * other team, and painting it in the goal colour credits the wrong club at
     * a glance — which is exactly the reading the crest column then contradicts.
     */
    case 'own-goal':
      return (
        <Svg {...box} viewBox="0 0 24 20" accessible={false}>
          <Circle cx={15.2} cy={10} r={8} fill={C.cardRed} />
          <Path d={PENTAGON} fill={C.background} />
          <Path d={TRAILS} stroke={C.cardRed} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      );

    case 'yellow':
    case 'red':
      return (
        <Svg {...box} viewBox="0 0 11 15" accessible={false}>
          <Rect
            x={1.5}
            y={1.6}
            width={8}
            height={11.4}
            rx={2}
            fill={kind === 'yellow' ? C.cardYellow : C.cardRed}
          />
        </Svg>
      );

    /** On is lime and up; off is muted and down. The pair reads without a caption. */
    case 'sub':
      return (
        <Svg {...box} viewBox="0 0 15 15" accessible={false}>
          <Path
            d="M4.4 12.6V4.1M2.1 6.3l2.3-2.3 2.3 2.3"
            stroke={C.accent}
            strokeWidth={1.7}
            strokeLinecap="round"
          />
          <Path
            d="M10.6 2.4v8.5M12.9 8.7l-2.3 2.3-2.3-2.3"
            stroke={C.textMuted}
            strokeWidth={1.7}
            strokeLinecap="round"
          />
        </Svg>
      );

    /** A monitor. Not drawn in the design — see ADR 0045 for why it is drawn at all. */
    case 'var':
      return (
        <Svg {...box} viewBox="0 0 18 15" accessible={false}>
          <Rect
            x={1.6}
            y={1.6}
            width={14.8}
            height={9.6}
            rx={2}
            stroke={C.textSecondary}
            strokeWidth={1.5}
            fill="none"
          />
          <Path
            d="M6 13.6h6"
            stroke={C.textSecondary}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </Svg>
      );

    /** The goal disc, hollow and struck through: the shot that did not go in. */
    case 'missed-penalty':
      return (
        <Svg {...box} viewBox="0 0 24 20" accessible={false}>
          <Circle
            cx={15.2}
            cy={10}
            r={7.2}
            stroke={C.textMuted}
            strokeWidth={1.6}
            fill="none"
          />
          <Path
            d="M10.6 15.2L19.8 4.8"
            stroke={C.textMuted}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
          <Path d={TRAILS} stroke={C.textMuted} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      );

    /**
     * ⚠⚠ The row that must never be dropped. `unknown` means the source
     * described something the backend has no name for yet — the minute and the
     * player are still true, and dropping is how a goal disappears.
     */
    default:
      return (
        <Svg {...box} viewBox="0 0 18 15" accessible={false}>
          <Circle cx={9} cy={7.5} r={2.5} fill={C.textFaint} />
        </Svg>
      );
  }
}
