/**
 * An eyebrow, a rule that fills the gap, and right-aligned meta — with an
 * optional `accessory` between the rule and the meta (the News screen's
 * `N NEW` pill, ADR 0070).
 */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Eyebrow, Hairline } from '@/components/atoms';
import { Spacing } from '@/constants/theme';

export interface SectionHeaderProps {
  title: string;
  meta?: string | null;
  tone?: 'default' | 'accent';
  accessory?: ReactNode;
}

export function SectionHeader({ title, meta, tone = 'default', accessory }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Eyebrow color={tone === 'accent' ? 'accent' : 'textFaint'}>{title}</Eyebrow>
      <View style={styles.rule}>
        <Hairline strength="mid" />
      </View>
      {accessory ?? null}
      {meta ? <Eyebrow color="textFaint">{meta}</Eyebrow> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rule: { flex: 1 },
});
