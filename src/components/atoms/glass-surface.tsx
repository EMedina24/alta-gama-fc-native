/**
 * A liquid-glass LAYER (ADR 0195) — the Medina kit's `GlassSurface`, cut to
 * how this app uses glass: a decorative shell drawn BEHIND a component's own
 * content, never a wrapper around it.
 *
 * Where liquid glass exists (`isLiquidGlassAvailable()`, iOS 26+) it is a real
 * `GlassView`; everywhere else a flat view painted with `flatStyle` — each
 * caller keeps its own flat fill, because a club bubble, a card and a menu
 * trigger each degrade to a different surface. There is deliberately no blur
 * fallback: the app floor is below 26 and every glass surface here already
 * degraded to an opaque fill before this atom existed.
 *
 * ⚠ The glass rules still bind (0120/0122; traps 59, 64, 69): no alpha or
 * transform-scale on a glass ancestor, nothing opaque directly under it, and
 * whatever sits behind it shows through.
 */
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/theme';

/**
 * Decided once at module scope — a component must pick its path BEFORE mount.
 * Exported for the few places that change something else with it (the sheet
 * ground, a sheet's sticky bar).
 */
export const LIQUID_GLASS = isLiquidGlassAvailable();

/**
 * A modal sheet's ground (ADR 0195, superseding 0093's opaque rule where glass
 * exists): transparent on iOS 26 so the formSheet's own system glass shows,
 * `sheetGround` everywhere else. Every surface that must MATCH the sheet — the
 * presenter's `contentStyle`, a pinned bar, a sheet's scroll — reads this, not
 * the colour, so the two paths can't split.
 */
export const SHEET_GROUND = LIQUID_GLASS ? 'transparent' : Colors.dark.sheetGround;

export interface GlassSurfaceProps {
  /** The shell's box — position, size, radius. Shared by both paths. */
  style: StyleProp<ViewStyle>;
  /** Added on the flat path only: the caller's opaque stand-in for glass. */
  flatStyle?: StyleProp<ViewStyle>;
  /** `clear` over imagery and small shells; `regular` for bars and controls. */
  glass?: 'clear' | 'regular';
}

export function GlassSurface({ style, flatStyle, glass = 'clear' }: GlassSurfaceProps) {
  return LIQUID_GLASS ? (
    <GlassView style={style} glassEffectStyle={glass} colorScheme="dark" />
  ) : (
    <View style={[style, flatStyle]} />
  );
}
