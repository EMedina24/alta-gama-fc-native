/**
 * One slot on the pitch: the ring and, under it, the name caption (ADR 0065).
 *
 * Three states, per `handoff_squad-builder/STARTING-XI.md`:
 * - **empty** — dashed ring, the position label inside, nothing under it. An
 *   empty slot names itself ONCE, inside the token: the caption is the
 *   player's name, so there is nothing to print until there is one.
 * - **filled** — the portrait when the player has one, the shirt number as a
 *   small badge on its corner; a lime disc with the number when he has not
 *   (ADR 0072). Name caption below, ellipsised at `Size.xiCaption`.
 * - **selected** — lime ring plus a `Size.xiHalo` halo, portrait or not.
 *
 * ⚠ A portrait that FAILS to load falls back to the number token, not to an
 * empty disc: hot-linked portraits 404, and a lime circle with nothing in it
 * read as a bug. The badge keeps the number legible over any picture, which
 * is how a reader checks a placement at a glance.
 *
 * ⚠ Sized by `size`, defaulting to `Size.xiToken`, because the export card
 * draws the same token at `CARD.ring × scale`. Every other dimension derives
 * from `size` so the two renderings are one design.
 *
 * ⚠ Knows nothing about players or slots: the board and the card decide what
 * `label` and `caption` are. A null shirt arrives here as initials, never `0`.
 *
 * ⚠ Not a hit target and owns no gesture — the board wraps it. `pointerEvents`
 * is `none` so a wrapping `Pressable`/`GestureDetector` gets every touch.
 */
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';

import { Colors, Radius, Size, Type } from '@/constants/theme';

export type SlotTokenMode = 'empty' | 'filled' | 'selected';

export interface SlotTokenProps {
  mode: SlotTokenMode;
  /** The position code when empty, the shirt number / initials when filled. */
  label: string;
  /** Under the ring; only drawn when filled. */
  caption?: string;
  /** A portrait inside the ring, clipped to the circle; the label becomes a badge. */
  portrait?: string | null;
  /** `onLoad`/`onError` of the portrait, so a capture can wait for it. */
  onPortraitSettled?: () => void;
  /** Ring diameter. Defaults to the board's `Size.xiToken`. */
  size?: number;
  /** Caption max width. Defaults to `Size.xiCaption`. */
  captionWidth?: number;
  /** Everything scales off the ring; the card passes its own type sizes. */
  labelSize?: number;
  captionSize?: number;
  /** Dimmed while being dragged. */
  ghosted?: boolean;
}

export function SlotToken({
  mode,
  label,
  caption,
  portrait,
  onPortraitSettled,
  size = Size.xiToken,
  captionWidth = Size.xiCaption,
  labelSize,
  captionSize,
  ghosted = false,
}: SlotTokenProps) {
  const [failed, setFailed] = useState(false);
  const filled = mode !== 'empty';
  const selected = mode === 'selected';
  const ratio = size / Size.xiToken;
  const ring = { width: size, height: size, borderRadius: size / 2 };
  const halo = Size.xiHalo * ratio;
  const border = (filled ? 2 : 1.5) * ratio;
  const numeral = labelSize ?? Type.xiNumeral.fontSize * ratio;
  const code = labelSize ?? Type.xiSlotLabel.fontSize * ratio;
  const captionFont = captionSize ?? Type.xiCaption.fontSize * ratio;
  const showPortrait = filled && !!portrait && !failed;
  const badge = Size.xiBadge * ratio;

  return (
    <View style={[styles.wrap, ghosted && styles.ghosted]} pointerEvents="none">
      {selected ? (
        <View
          style={[
            styles.halo,
            {
              width: size + halo * 2,
              height: size + halo * 2,
              borderRadius: (size + halo * 2) / 2,
              top: -halo,
              left: -halo,
            },
          ]}
        />
      ) : null}
      {/* The box is the ring's footprint WITHOUT clipping, so the badge can
          sit on the ring's corner; the ring inside clips the portrait. */}
      <View style={{ width: size, height: size }}>
        <View
          style={[
            styles.ring,
            ring,
            filled ? styles.filled : styles.empty,
            showPortrait && styles.portraitGround,
            { borderWidth: border },
            selected && styles.selectedRing,
          ]}>
          {showPortrait ? (
            <Image
              source={{ uri: portrait }}
              style={ring}
              contentFit="cover"
              contentPosition="top center"
              transition={0}
              cachePolicy="memory-disk"
              onLoad={onPortraitSettled}
              onError={() => {
                setFailed(true);
                onPortraitSettled?.();
              }}
              accessible={false}
            />
          ) : (
            <RNText
              allowFontScaling={false}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              style={[
                filled ? Type.xiNumeral : Type.xiSlotLabel,
                styles.label,
                {
                  fontSize: filled ? numeral : code,
                  color: filled ? Colors.dark.onAccent : selected ? Colors.dark.accent : Colors.dark.text,
                },
              ]}>
              {label}
            </RNText>
          )}
        </View>
        {showPortrait ? (
          <View
            style={[
              styles.badge,
              {
                width: badge,
                height: badge,
                borderRadius: badge / 2,
                borderWidth: 1.5 * ratio,
              },
            ]}>
            <RNText
              allowFontScaling={false}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              style={[Type.xiBadge, styles.label, { fontSize: Type.xiBadge.fontSize * ratio }]}>
              {label}
            </RNText>
          </View>
        ) : null}
      </View>
      {filled && caption ? (
        <RNText
          allowFontScaling={false}
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            Type.xiCaption,
            styles.caption,
            {
              fontSize: captionFont,
              maxWidth: captionWidth,
              marginTop: 5 * ratio,
              paddingHorizontal: 5 * ratio,
              paddingVertical: 3 * ratio,
              borderRadius: Radius.chipSm * ratio,
            },
          ]}>
          {caption}
        </RNText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  ghosted: { opacity: 0.4 },
  halo: { position: 'absolute', backgroundColor: Colors.dark.accentWash },
  ring: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  empty: {
    backgroundColor: Colors.dark.slotEmpty,
    borderColor: Colors.dark.slotRing,
    borderStyle: 'dashed',
  },
  filled: { backgroundColor: Colors.dark.accent, borderColor: Colors.dark.slotEdge },
  /** Under a portrait the disc is the raised ground, so a transparent PNG
      does not float on lime. */
  portraitGround: { backgroundColor: Colors.dark.raisedAlt },
  selectedRing: { borderColor: Colors.dark.accent, borderStyle: 'solid' },
  label: { textAlign: 'center', fontVariant: ['tabular-nums'], color: Colors.dark.onAccent },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.slotEdge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    color: Colors.dark.text,
    backgroundColor: Colors.dark.captionScrim,
    textAlign: 'center',
    overflow: 'hidden',
  },
});
