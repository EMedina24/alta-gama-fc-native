/**
 * The formation pop-over (ADR 0213): eleven shapes in a short list anchored
 * under the formation chip, the current one checked.
 *
 * ⚠⚠ **OPAQUE paint, not glass** — traps 59, 69, 71 and 74: a glass panel
 * floating over the scene and the pitch picks up whatever moves beneath it,
 * and a glass surface cannot fade (an alpha on a glass ancestor kills it). So
 * it is `xiPopover`, and it may fade up on mount.
 *
 * ⚠ No dimming backdrop (the handoff's). A tap outside closes it through a
 * clear full-screen catcher; a pick closes it IN THE SAME COMMIT as the change,
 * so there is never a frame of the old shape under a closing menu.
 */
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';

import { Check, Text } from '@/components/atoms';
import { Colors, Ease, Radius, Size, Spacing, Xi, XiMotion } from '@/constants/theme';

export interface FormationMenuProps<T extends string> {
  title: string;
  value: T;
  options: readonly T[];
  /** Where the panel's top edge sits, and ONE of its sides, in the screen's coordinates. */
  top: number;
  left?: number;
  right?: number;
  onPick: (next: T) => void;
  onClose: () => void;
  closeLabel: string;
}

const ENTER = FadeIn.duration(XiMotion.popover)
  .easing(Easing.bezier(Ease.kit[0], Ease.kit[1], Ease.kit[2], Ease.kit[3]))
  .reduceMotion(ReduceMotion.System);

export function FormationMenu<T extends string>({
  title,
  value,
  options,
  top,
  left,
  right,
  onPick,
  onClose,
  closeLabel,
}: FormationMenuProps<T>) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
      />
      <Animated.View entering={ENTER} style={[styles.panel, { top, left, right }]} accessibilityViewIsModal>
        <Text variant="eyebrowSm" color="textMuted" style={styles.title}>
          {title}
        </Text>
        <ScrollView
          style={styles.list}
          bounces={false}
          // ⚠ Not the tab's scroll view: NativeTabs insets the first ScrollView it finds.
          contentInsetAdjustmentBehavior="never">
          {options.map((option) => {
            const on = option === value;
            return (
              <Pressable
                key={option}
                onPress={() => onPick(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={({ pressed }) => [styles.row, (on || pressed) && styles.rowOn]}>
                <Text variant="xiFormationLg" tabular>
                  {option}
                </Text>
                {on ? <Check /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    width: Xi.popoverW,
    maxHeight: 560,
    borderRadius: Xi.popoverRadius,
    padding: Spacing.one + 2,
    backgroundColor: Colors.dark.xiPopover,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.xiControlLine,
  },
  title: { paddingHorizontal: Spacing.three - 2, paddingTop: Spacing.two, paddingBottom: Spacing.one },
  list: { flexGrow: 0 },
  row: {
    height: Xi.popoverRow,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three - 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowOn: { backgroundColor: Colors.dark.xiStatus },
});
