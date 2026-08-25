/** An eyebrow, a rule that fills the gap, and right-aligned meta. */
import { StyleSheet, View } from 'react-native';

import { Eyebrow, Hairline } from '@/components/atoms';
import { Spacing } from '@/constants/theme';

export interface SectionHeaderProps {
  title: string;
  meta?: string | null;
  tone?: 'default' | 'accent';
}

export function SectionHeader({ title, meta, tone = 'default' }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Eyebrow color={tone === 'accent' ? 'accent' : 'textFaint'}>{title}</Eyebrow>
      <View style={styles.rule}>
        <Hairline strength="mid" />
      </View>
      {meta ? <Eyebrow color="textFaint">{meta}</Eyebrow> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rule: { flex: 1 },
});
