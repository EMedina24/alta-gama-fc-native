/**
 * The Pitch sheet (ADR 0065): three look presets drawn as live previews of
 * the real `PitchSurface`, so what is picked is what is drawn.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/atoms';
import { PitchSurface } from '@/components/molecules';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { LOOK_IDS, type Look } from '@/features/starting-xi/formations';

export interface XiLookSheetProps {
  current: Look;
  onPick: (look: Look) => void;
  title: string;
  labels: Record<Look, string>;
  doneLabel: string;
  onDone: () => void;
}

export function XiLookSheet({ current, onPick, title, labels, doneLabel, onDone }: XiLookSheetProps) {
  return (
    <View style={styles.wrap}>
      <Text variant="title3">{title}</Text>
      <View style={styles.row}>
        {LOOK_IDS.map((look) => {
          const on = look === current;
          return (
            <Pressable
              key={look}
              onPress={() => onPick(look)}
              accessibilityRole="button"
              accessibilityLabel={labels[look]}
              accessibilityState={{ selected: on }}
              style={styles.option}>
              <View style={[styles.frame, on && styles.frameOn]}>
                <View style={look === 'angled' ? styles.tilted : undefined}>
                  <PitchSurface
                    look={look}
                    width={PREVIEW_W}
                    height={Size.xiLookPreview}
                    borderRadius={Radius.control - 2}
                  />
                </View>
              </View>
              <Text variant="callout" color={on ? 'accent' : 'textSecondary'} center>
                {labels[look]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Button label={doneLabel} tone="secondary" onPress={onDone} />
    </View>
  );
}

/** Three across inside a 393 sheet with 20 padding and two 10 gaps. */
const PREVIEW_W = 104;

const styles = StyleSheet.create({
  wrap: { padding: Spacing.five, paddingTop: Spacing.six, gap: Spacing.four },
  row: { flexDirection: 'row', gap: Spacing.two + 2, justifyContent: 'space-between' },
  option: { flex: 1, gap: Spacing.two, alignItems: 'center' },
  frame: {
    borderRadius: Radius.control,
    borderWidth: 2,
    borderColor: Colors.dark.hairlineMid,
    overflow: 'hidden',
  },
  frameOn: { borderColor: Colors.dark.accent },
  tilted: { transformOrigin: '50% 100%', transform: [{ perspective: 400 }, { rotateX: '13deg' }] },
});
