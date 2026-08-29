/**
 * The Export sheet (ADR 0065): card title, size, a live preview of the card,
 * Save to Photos, Share, and the note that the PNG is a true 1080 render.
 *
 * ⚠ The preview IS `LineupCard` at a small scale — the same component the
 * capture draws at full size. The `size` choice is not persisted (web parity).
 *
 * ⚠ Accent budget inside the sheet: Save is the one primary; Share is
 * secondary. The two do the same render and differ only in the hand-off.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Text } from '@/components/atoms';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import {
  EXPORT_SIZES,
  EXPORT_SIZE_IDS,
  TITLE_MAX,
  type ExportSize,
} from '@/features/starting-xi/card-geometry';
import { LineupCard, type LineupCardProps } from './lineup-card';

export interface XiExportSheetProps {
  card: Omit<LineupCardProps, 'size' | 'scale' | 'onImagesSettled'>;
  size: ExportSize;
  onSize: (size: ExportSize) => void;
  title: string;
  onTitle: (title: string) => void;
  onSave: () => void;
  onShare: () => void;
  busy: boolean;
  status: string | null;
  labels: {
    heading: string;
    cardTitle: string;
    sizes: Record<ExportSize, string>;
    save: string;
    share: string;
    note: string;
    done: string;
  };
  onDone: () => void;
}

/** Preview width inside the sheet: 393 − 2 × 20. */
const PREVIEW_W = 353;

export function XiExportSheet({
  card,
  size,
  onSize,
  title,
  onTitle,
  onSave,
  onShare,
  busy,
  status,
  labels,
  onDone,
}: XiExportSheetProps) {
  const [draft, setDraft] = useState(title);
  const scale = PREVIEW_W / EXPORT_SIZES[size].w;
  const previewH = EXPORT_SIZES[size].h * scale;

  return (
    <View style={styles.wrap}>
      <Text variant="title3">{labels.heading}</Text>

      <View style={styles.field}>
        <Text variant="eyebrowSm" color="textFaint">
          {labels.cardTitle}
        </Text>
        <TextInput
          value={draft}
          onChangeText={(t) => setDraft(t.slice(0, TITLE_MAX))}
          onEndEditing={() => onTitle(draft)}
          maxLength={TITLE_MAX}
          returnKeyType="done"
          style={styles.input}
          placeholderTextColor={Colors.dark.textFaint}
          selectionColor={Colors.dark.accent}
          keyboardAppearance="dark"
        />
      </View>

      <View style={styles.sizes}>
        {EXPORT_SIZE_IDS.map((id) => {
          const on = id === size;
          return (
            <Pressable
              key={id}
              onPress={() => onSize(id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.sizeCell, on && styles.sizeOn]}>
              <Text variant="callout" color={on ? 'accent' : 'text'}>
                {labels.sizes[id]}
              </Text>
              <Text variant="micro" color="textMuted" tabular>
                {EXPORT_SIZES[id].px}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.preview, { height: previewH }]}>
        <LineupCard {...card} size={size} scale={scale} />
      </View>

      <Button label={labels.save} onPress={onSave} loading={busy} />
      <Button label={labels.share} tone="secondary" onPress={onShare} disabled={busy} />
      {status ? (
        <Text variant="caption" color="textSecondary" center>
          {status}
        </Text>
      ) : null}
      <Text variant="caption" color="textMuted" style={styles.note}>
        {labels.note}
      </Text>
      <Button label={labels.done} tone="quiet" onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: Spacing.five, paddingTop: Spacing.six, gap: Spacing.three },
  field: { gap: Spacing.one },
  input: {
    ...Type.headline,
    color: Colors.dark.text,
    backgroundColor: Colors.dark.raised,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  sizes: { flexDirection: 'row', gap: Spacing.two + 1 },
  sizeCell: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Radius.control,
    backgroundColor: Colors.dark.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.hairlineMid,
    alignItems: 'center',
    gap: Spacing.half,
  },
  sizeOn: { backgroundColor: Colors.dark.accentWash, borderColor: Colors.dark.accentRing },
  preview: { borderRadius: Radius.control, overflow: 'hidden', alignSelf: 'stretch' },
  note: { fontWeight: '400' },
});
