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
 * ⚠ The gradient runs to y = 0, BEHIND the status bar (ADR 0094). The scaffold
 * therefore flips the status bar to dark glyphs while the bright band is up
 * there, and back to light once it has scrolled past — white on lime and black
 * on the mesh are each unreadable, so neither style is correct on its own.
 */
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Eyebrow, Text, WashGradient, WashRadial } from '@/components/atoms';
import {
  CrownGrad,
  CrownHighlight,
  CrownRamp,
  MaxContentWidth,
  Spacing,
} from '@/constants/theme';

export interface CrownProps {
  eyebrow?: string;
  title: string;
  /** `crownTitleLg` is the Clubs screen's 48pt (its subhead carries the count). */
  titleVariant?: 'crownTitle' | 'crownTitleLg';
  /** A quiet line UNDER the title — Clubs' `{n} clubs followed` (ADR 0082). */
  subtitle?: string;
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
   * The safe-area top inset (ADR 0094). The crown's GRADIENT starts at y = 0 —
   * the lime runs up behind the status bar — and this pushes its CONTENT back
   * down clear of the notch. It is padding, never a margin: a margin would
   * move the gradient with it and leave the dark band the crown exists to
   * fill.
   */
  topInset?: number;
}

export function Crown({
  eyebrow,
  title,
  titleVariant = 'crownTitle',
  subtitle,
  meta,
  accessory,
  children,
  padBottom,
  topInset = 0,
}: CrownProps) {
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
      <View pointerEvents="none" style={[styles.layer, { height: layerHeight }]}>
        <WashGradient angle="vertical" stops={CrownGrad} />
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
      </View>
      <View
        style={[styles.inner, { paddingTop: topInset + Spacing.two + 2, paddingBottom: pad }]}>
        <View style={styles.head}>
          <View style={styles.headings}>
            {eyebrow ? <Eyebrow color="onCrownDim">{eyebrow}</Eyebrow> : null}
            <Text variant={titleVariant} color="onCrown">
              {title}
            </Text>
            {subtitle ? (
              <Text variant="caption" color="onCrownDim" style={styles.subtitle}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {meta}
          {accessory}
        </View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ⚠ `overflow` stays VISIBLE — the fixed layer may be taller than the box,
  // and clipping it would put a hard edge exactly where the fade hands off.
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
});
