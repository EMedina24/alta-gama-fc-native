/**
 * One slot on the live pitch: an empty dashed ring with its slot id, or a
 * placed player — his orb, shirt badge and name pill (ADR 0213).
 *
 * ⚠ Drawn at a REFERENCE size and never re-laid out while the camera moves:
 * the token layer scales and moves it with a transform, so every measure here
 * is in plane units × `unit` (the points per unit it was laid out at).
 *
 * ⚠ The layout box is the DISC. The badge, the name pill and the empty slot's
 * label all hang outside it, absolutely — so the token layer's transform
 * pivots on the disc's centre, which is the slot's anchor.
 *
 * ⚠ The name sits BELOW the disc in flat and ABOVE it in 3D (the handoff's
 * rule: a standing token's name must not be hidden behind the one in front).
 *
 * ⚠ `part` splits the token so the pitch can paint every DISC first and every
 * NAME after: in flat the keeper's orb reaches up into the centre-backs' names,
 * and a name hidden under a neighbour's orb is a name not read.
 */
import { StyleSheet, Text as RNText, View } from 'react-native';

import { PlusGlyph, ShirtBadge, XiOrb } from '@/components/atoms';
import { Colors, Radius, Xi } from '@/constants/theme';

export interface XiTokenPlayer {
  initials: string;
  photoUrl: string | null;
  shirt: number | null;
  name: string;
}

export interface XiTokenProps {
  /** Points per plane unit at the reference size. */
  unit: number;
  slot: string;
  player: XiTokenPlayer | null;
  /** A lime ring: the player whose card is open, or the slot being picked for. */
  active?: boolean;
  nameAbove?: boolean;
  /** The widest a name pill may be here, in plane units. */
  pillMax?: number;
  /** Draw the disc, the name (or empty-slot label), or both. */
  part?: 'disc' | 'label' | 'both';
}

export function XiToken({
  unit,
  slot,
  player,
  active = false,
  nameAbove = false,
  pillMax = Xi.pillMax,
  part = 'both',
}: XiTokenProps) {
  const size = Xi.token * unit;
  const gap = Xi.nameGap * unit;
  const pillW = pillMax * unit;
  const disc = part !== 'label';
  const label = part !== 'disc';

  if (!player) {
    return (
      <View style={{ width: size, height: size }}>
        {disc ? (
          <View
            style={[
              styles.empty,
              {
                width: size,
                height: size,
                borderWidth: Xi.slotDash * unit,
                borderColor: active ? Colors.dark.accent : Colors.dark.xiSlotDash,
                backgroundColor: active ? Colors.dark.accentWash : Colors.dark.xiSlotWash,
              },
            ]}>
            <PlusGlyph color={active ? 'accent' : 'textSecondary'} size={size * 0.32} />
          </View>
        ) : null}
        {label ? (
          <View pointerEvents="none" style={[styles.hang, { top: size + gap, left: (size - pillW) / 2, width: pillW }]}>
            <RNText
              allowFontScaling={false}
              numberOfLines={1}
              style={[
                styles.slotLabel,
                {
                  color: active ? Colors.dark.accent : Colors.dark.textSecondary,
                  fontSize: Xi.slotLabelFont * unit,
                  lineHeight: Xi.slotLabelFont * unit * 1.2,
                  letterSpacing: Xi.slotLabelTracking * unit,
                },
              ]}>
              {slot}
            </RNText>
          </View>
        ) : null}
      </View>
    );
  }

  const badge = Xi.badge * unit;
  const pillStyle = nameAbove ? { bottom: size + gap } : { top: size + gap };
  return (
    <View style={{ width: size, height: size }}>
      {disc ? (
        <XiOrb
          size={size}
          initials={player.initials}
          photoUrl={player.photoUrl}
          ring={active ? 'lime' : 'white'}
          ringWidth={Xi.tokenRing * unit}
          halo={Xi.tokenHalo * unit}
        />
      ) : null}
      {disc && player.shirt !== null ? (
        <View pointerEvents="none" style={[styles.badge, { top: -10 * unit, right: -10 * unit }]}>
          <ShirtBadge shirt={player.shirt} size={badge} ring={Xi.badgeRing * unit} />
        </View>
      ) : null}
      {label ? (
        <View pointerEvents="none" style={[styles.hang, pillStyle, { left: (size - pillW) / 2, width: pillW }]}>
          <View
            style={[
              styles.pill,
              {
                paddingHorizontal: Xi.namePadX * unit,
                paddingVertical: Xi.namePadY * unit,
                borderRadius: Xi.namePadX * unit,
              },
            ]}>
            <RNText
              allowFontScaling={false}
              numberOfLines={1}
              style={[styles.name, { fontSize: Xi.nameFont * unit, lineHeight: Xi.nameFont * unit * 1.2 }]}>
              {player.name}
            </RNText>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    borderRadius: Radius.pill,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hang: { position: 'absolute', alignItems: 'center' },
  slotLabel: { fontWeight: '800', textAlign: 'center' },
  badge: { position: 'absolute' },
  pill: { maxWidth: '100%', backgroundColor: Colors.dark.xiNamePill },
  name: { color: Colors.dark.text, fontWeight: '600', textAlign: 'center' },
});
