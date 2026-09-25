/**
 * The CROWN (ADR 0087): the lime→teal head each tab wears, carrying the
 * screen's eyebrow, title and — through `children` — its own controls (the
 * payload: Today's live plate, Matchdays' pager and chips, Table's league
 * picker, Clubs' search and rail).
 *
 * ⚠ **Nothing in the crown may sit at a z-index below the screen ground** —
 * the one bug found while the design was built made the title vanish
 * (APP-SHELL.md). The two SVG layers are the crown's own FIRST children and
 * absolute-fill it; content renders after them, so it always paints on top.
 * Never move the gradient outside this component.
 *
 * ⚠ **Ink discipline is by slot, not enforcement**: the head (eyebrow, title,
 * subtitle, meta, accessory) sits in the BRIGHT band and takes `onCrown*`
 * inks. A payload that reaches below the midpoint — the Clubs rail is the
 * live example — uses the normal dark-theme tokens there: black ink dies on
 * the dark green exactly as grey ink dies on the lime.
 *
 * ⚠ The crown ends in TRANSPARENCY, never a hard edge — `CrownGrad`'s last
 * stop hands the surface off to the mesh. Its height is content-driven: with
 * no payload it collapses to eyebrow + title (`padBottom` shrinks), which is
 * exactly Today's idle state.
 *
 * ⚠ It renders INSIDE the scroll view (it scrolls away with the page) and
 * full-bleed — the screen gutter lives on `inner`, not on the scaffold's
 * content container.
 *
 * ⚠⚠ **Never give this a `zIndex`, and never let a payload ask for one** (ADR
 * 0163). The gradient layer below is deliberately taller than this box and runs
 * on BEHIND the body; raise the crown above the body and that overflow paints ON
 * the body instead, veiling the top of the screen in the fade's tail — on the
 * Table that was the band legend and the first two rows going hazy (simulator,
 * 2026-09-13). ADR 0162 shipped exactly that as a temporary `lifted` flag, held
 * only while the payload's own scrim covered the veil; it was still wrong,
 * because the flag is React state and the scrim is an animation, so the two
 * could not end on the same frame. A control that must draw over the body
 * publishes to `useScreenOverlay` instead — over the scroll view, where the
 * crown's layering is not its problem.
 *
 * ⚠ The gradient runs to y = 0, BEHIND the status bar (ADR 0094). The scaffold
 * therefore flips the status bar to dark glyphs while the bright band is up
 * there, and back to light once it has scrolled past — white on lime and black
 * on the mesh are each unreadable, so neither style is correct on its own.
 */
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Eyebrow, Text, WashGradient, WashRadial, type WashStop } from '@/components/atoms';
import type { CrownTone } from '@/lib/cronogol/league-theme';
import {
  CrownGrad,
  CrownHighlight,
  CrownRamp,
  MaxContentWidth,
  Spacing,
} from '@/constants/theme';

/**
 * How far below the safe-area inset the bled crest starts, and how much of it
 * hangs off the right edge (ADR 0165).
 *
 * ⚠ **Both are device-judged, and the first cut was wrong in both axes.** At
 * `top: 0` and a six-space bleed the mark sat behind the status bar and the
 * banner pill, and its widest circle landed directly under the title — which
 * made it read as a second subject competing with the words rather than as
 * wallpaper. `ART_DROP` clears the banner row; `ART_OFF` takes enough of the
 * mark off-screen that what remains is a fragment, which is what a watermark is.
 * The club hero's own bleed is the same lesson (`BLEED_OFF`, ADR 0091/0098).
 */
const ART_DROP = 76;
const ART_OFF = 44;
/**
 * The HEAD-LEFT anchor (ADR 0180) — the Board's club watermark. It began at
 * `inner`'s own top padding and the league mark's `ART_OFF`; both nudged on
 * Ed's eye (2026-09-14, "just a bit up and to the right"): the crown's tip
 * now rides 6pt into the safe-area inset, and only 24pt hangs off the left
 * edge. ⚠ Device-judged — move them by screenshot, not arithmetic.
 */
const ART_HEAD_DROP = -6;
const ART_HEAD_OFF = 24;

export interface CrownProps {
  eyebrow?: string;
  /**
   * Absent renders the GRADIENT HEAD alone — the onboarding welcome's aurora
   * (ADR 0099), where the brand moment below carries the words. Every tab
   * passes one.
   */
  title?: string;
  /** `crownTitleLg` is the Clubs screen's 48pt (its subhead carries the count). */
  titleVariant?: 'crownTitle' | 'crownTitleLg' | 'crownTitleXl';
  /** A quiet line UNDER the title — Clubs' `{n} clubs followed` (ADR 0082). */
  subtitle?: string;
  /**
   * REPLACES the whole eyebrow/title/subtitle/metaLine stack (ADR 0179) —
   * the Board's club-crest head: with a club background on, the crest IS the
   * screen's identity mark and the words step aside. `meta` and `accessory`
   * keep their row. ⚠ The caller owns the node's accessibility: the stack it
   * replaces carried the screen's heading, so the node must speak (the board
   * labels it with the club's name, role `header`).
   */
  headLead?: ReactNode;
  /** A right-aligned block beside the title — Table's "AFTER MD n" lines. */
  meta?: ReactNode;
  /** Right of the title — the account avatar (`AvatarButton tone="crown"`). */
  accessory?: ReactNode;
  /** The payload. Height is content-driven; no payload collapses the crown. */
  children?: ReactNode;
  /**
   * Bottom padding under the payload, before the fade hands off to the mesh.
   * The mock runs 18 (idle Today) to 44 (a plate in the crown); the default
   * splits by whether a payload exists.
   */
  padBottom?: number;
  /**
   * The crown's vertical ramp (ADR 0164). Defaults to the brand's `CrownGrad`;
   * a league-scoped screen passes `leagueCrownTheme(apiSlug).stops`, which is a
   * DEEP ramp in that league's hue (ADR 0165).
   *
   * ⚠ It is a ramp, not a colour: the stops carry the lightness ladder that
   * keeps `onCrown`'s dark ink legal on the bright band, and the last stop is
   * the transparent hand-off to the mesh. Never pass a flat two-stop gradient
   * here — that is the hard edge this component's header forbids.
   */
  stops?: readonly WashStop[];
  /**
   * Which ink family the head takes (ADR 0165) — `bright` is the brand's lime
   * band with dark `onCrown*` ink; `deep` is a league's dark band with white
   * `onDeep*` ink.
   *
   * ⚠⚠ **It must come from the same call that produced `stops`**
   * (`leagueCrownTheme`), never from a screen's own "do I have a league?" test.
   * A competition with no `LeagueBand` row wears the BRAND ramp and therefore
   * keeps DARK ink; deriving the two separately is what breaks that case.
   */
  tone?: CrownTone;
  /**
   * Background art, drawn into the gradient layer — the league crest, bled
   * (ADR 0165). It lands ABOVE the ramp and BELOW the head, and inherits the
   * layer's `pointerEvents="none"`.
   */
  art?: ReactNode;
  /**
   * Where `art` hangs (ADR 0180): `right` is the league marks' spot (below
   * the banner row, bled off the right edge); `headLeft` is the Board's club
   * watermark — top-LEFT in the title's own place, bled off the left edge,
   * running down BEHIND the payload card.
   */
  artAnchor?: 'right' | 'headLeft';
  /**
   * A control row ABOVE the head — the banner pill and the avatar (ADR 0165).
   *
   * ⚠ Rendered OUTSIDE the `title` gate below, deliberately. Matchdays passes
   * `title=''` until its matchweek resolves, and with the head gated on the
   * title the whole header used to vanish on first paint. The banner is the
   * screen's identity and its way out; it must survive that state.
   */
  banner?: ReactNode;
  /**
   * A dot-separated line UNDER the title — Matchdays' date range, match count
   * and zone (ADR 0165).
   *
   * ⚠ Not `meta`, which is a row sibling BESIDE the title and is what the two
   * onboarding screens put their `StepDots` in.
   */
  metaLine?: string;
  /**
   * `quiet` is the provisional state — Matchdays' "dates to be confirmed" reads
   * a shade back, which is the honesty signal `MatchdayPager.primaryTone`
   * carried before this slot replaced it. Never cosmetic.
   */
  metaTone?: 'strong' | 'quiet';
  /**
   * The safe-area top inset (ADR 0094). The crown's GRADIENT starts at y = 0 —
   * the lime runs up behind the status bar — and this pushes its CONTENT back
   * down clear of the notch. It is padding, never a margin: a margin would
   * move the gradient with it and leave the dark band the crown exists to
   * fill.
   */
  topInset?: number;
  /**
   * No gradient layer at all (ADR 0201) — the screen paints its own fixed
   * league SCENE behind the scroll, and the crown is only its content: banner,
   * head and payload. ⚠ `tone` still decides the ink; a bare crown sits on a
   * dark scene, so its caller passes `deep`.
   */
  bare?: boolean;
}

export function Crown({
  eyebrow,
  title,
  titleVariant = 'crownTitle',
  headLead,
  artAnchor = 'right',
  subtitle,
  meta,
  accessory,
  children,
  padBottom,
  stops = CrownGrad,
  tone = 'bright',
  art,
  banner,
  metaLine,
  metaTone = 'strong',
  topInset = 0,
  bare = false,
}: CrownProps) {
  /**
   * The head's ink, by surface. ⚠ Two families, not one with an override: the
   * dark set is only legal on a bright band and the white set only on a deep
   * one, so the pair travels together with the ramp that earned it.
   */
  const deep = tone === 'deep';
  const ink = deep ? 'onDeep' : 'onCrown';
  const inkDim = deep ? 'onDeepDim' : 'onCrownDim';
  const pad = padBottom ?? (children ? Spacing.eight : Spacing.four + 2);

  /**
   * ⚠⚠ The gradient is a FIXED-HEIGHT layer, not a fill of the box (ADR
   * 0094/0095): `topInset + CrownRamp`, anchored at the top — the mock's own
   * Clubs construction, now shared by every screen. Fractions of the box made
   * a short crown compress the whole ramp, which put Today's title on
   * mid-teal while Clubs' identical title sat on lime; a fixed layer puts the
   * same colour at the same distance from the top everywhere. A crown shorter
   * than the layer simply lets the fade run on behind the body (the box does
   * not clip), and one taller ends past it, where the layer is already
   * transparent — neither leaves a hard edge.
   */
  const layerHeight = topInset + CrownRamp;

  return (
    <View style={styles.crown}>
      {bare ? null : (
        <View pointerEvents="none" style={[styles.layer, { height: layerHeight }]}>
          <WashGradient angle="vertical" stops={stops} />
          {/* ⚠ The white sheen is the BRIGHT crown's alone. At alpha 0.26 over a
              deep league ramp it reads as a grey veil across the top-right
              shoulder — it lifts a lime band and washes out a dark one. */}
          {deep ? null : (
            <WashRadial
              cx={CrownHighlight.cx}
              cy={CrownHighlight.cy}
              rx={CrownHighlight.rx}
              ry={CrownHighlight.ry}
              stops={[
                { offset: 0, color: CrownHighlight.color, opacity: CrownHighlight.alpha },
                { offset: CrownHighlight.fade, color: CrownHighlight.color, opacity: 0 },
              ]}
            />
          )}
          {/* Above the ramp, below the head — and inside the layer, so it cannot
              be raised over the body (this component may never take a z-index). */}
          {art ? (
            <View
              style={[
                styles.art,
                artAnchor === 'headLeft'
                  ? { top: topInset + ART_HEAD_DROP, left: -ART_HEAD_OFF }
                  : { top: topInset + ART_DROP, right: -ART_OFF },
              ]}>
              {art}
            </View>
          ) : null}
        </View>
      )}
      <View
        style={[styles.inner, { paddingTop: topInset + Spacing.two + 2, paddingBottom: pad }]}>
        {banner}
        {title || headLead ? (
          <View style={styles.head}>
            <View style={styles.headings}>
              {headLead ?? (
                <>
                  {eyebrow ? <Eyebrow color={inkDim}>{eyebrow}</Eyebrow> : null}
                  <Text variant={titleVariant} color={ink}>
                    {title}
                  </Text>
                  {subtitle ? (
                    <Text variant="caption" color={inkDim} style={styles.subtitle}>
                      {subtitle}
                    </Text>
                  ) : null}
                  {metaLine ? (
                    <Text
                      variant="eyebrowSm"
                      color={metaTone === 'strong' ? ink : inkDim}
                      tabular
                      style={styles.metaLine}>
                      {metaLine}
                    </Text>
                  ) : null}
                </>
              )}
            </View>
            {meta}
            {accessory}
          </View>
        ) : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ⚠ `overflow` stays VISIBLE — the fixed layer may be taller than the box,
  // and clipping it would put a hard edge exactly where the fade hands off.
  //
  // ⚠⚠ `zIndex` is what lets a payload CONTROL hang over the screen body — the
  // league dropdown's panel (ADR 0162) opens downward past the crown's bottom
  // edge, and the body is the crown's NEXT SIBLING in the scroll's content. A
  // z-index on the panel alone cannot do it: it raises a child among its own
  // siblings, never past its parent's. It is also the header's own rule made
  // literal — nothing in the crown may sit below the screen ground.
  crown: { position: 'relative' },
  /** The fixed gradient layer; its height is set inline (`topInset + CrownRamp`). */
  layer: { position: 'absolute', top: 0, left: 0, right: 0 },
  inner: {
    // ⚠ `paddingTop` is applied inline — it carries the safe-area inset.
    paddingHorizontal: Spacing.five,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  headings: { flex: 1, gap: Spacing.one },
  subtitle: { marginTop: Spacing.one },
  metaLine: { marginTop: Spacing.two },
  /**
   * The bled crest. ⚠ Anchored to the layer's RIGHT edge and pushed off it, so
   * the cut happens at the physical screen edge — the one place ADR 0098 says a
   * hard clip reads as intentional. Its foot needs no clip: the art's own fill
   * has already faded to nothing (`PremierCrest`). `top`/`right` are inline —
   * they carry the safe-area inset and the bleed.
   */
  art: { position: 'absolute' },
});
