/**
 * A generic segmented control — the track-and-segments pattern `EventTabs`
 * draws for match events, freed of its counts and its `EventGroup` typing so a
 * form can switch modes with it (ADR 0103: Entrar / Crear cuenta).
 *
 * ⚠ No animation, matching `EventTabs`: ADR 0045 rejected animating controls
 * like this for consistency, so the selection moves by re-render. ⚠ The Season
 * stats mock asks for a `.35s` thumb transition and does NOT get one (ADR
 * 0147) — one control that animates among three that do not is worse than
 * three that agree.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /**
   * `quiet` is the form idiom (ADR 0103): a glass track, the selected segment
   * lifted to `raisedAlt`, ink carrying the state.
   *
   * `accent` fills the selected segment with lime and inverts its ink (ADR
   * 0141) — the Season stats view switch, which is the screen's primary and
   * only control and sits on a club-tinted hero where a three-point lift does
   * not read. ⚠ It spends the screen's one lime hero (SPEC §2); a screen using
   * `accent` here must not also carry a solid-lime button.
   */
  tone?: 'quiet' | 'accent';
  /** The control's accessible name; each segment reports as a tab. */
  accessibilityLabel?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  tone = 'quiet',
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const accent = tone === 'accent';
  return (
    <View
      style={[styles.track, accent && styles.trackAccent]}
      accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            // ⚠ The segment paints shorter than the 44pt minimum; the target
            // grows instead of the paint, same trade as `EventTabs`.
            hitSlop={{ top: 8, bottom: 8 }}
            style={({ pressed }) => [
              styles.segment,
              accent && styles.segmentTall,
              selected && (accent ? styles.segmentAccent : styles.segmentActive),
              pressed && !selected && styles.segmentPressed,
            ]}>
            <Text
              variant="callout"
              // ⚠ The unselected ink differs by tone and is not a free choice:
              // `textMuted` reads correctly against a glass track and vanishes
              // against the accent tone's darker recess, which is why that one
              // sits a step brighter.
              color={
                selected
                  ? accent
                    ? 'onAccent'
                    : 'text'
                  : accent
                    ? 'textSecondary'
                    : 'textMuted'
              }
              numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: Spacing.one,
    backgroundColor: Colors.dark.glassFill,
    borderRadius: Radius.chip,
    padding: Spacing.one,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.seg,
  },
  segmentActive: { backgroundColor: Colors.dark.raisedAlt },
  // A recessed track rather than a glass one: the accent tone is used over a
  // club wash, where a white fill picks up the club's colour and a dark well
  // does not.
  trackAccent: {
    backgroundColor: Colors.dark.recess,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.hairlineStrong,
    borderRadius: Radius.thumb,
  },
  segmentTall: { height: Size.pill, paddingVertical: 0 },
  segmentAccent: { backgroundColor: Colors.dark.accent },
  segmentPressed: { opacity: 0.6 },
});
