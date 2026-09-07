/**
 * The News front page's LEAD card (ADR 0130) — the newest story, on glass,
 * overlapping the hero photo's foot: topic pill · publisher · age, a big
 * two-ish-line headline, and the lime `Tap to read ›` invitation.
 *
 * ⚠ Takes flat scalars, never an article (ADR 0013). The screen derives
 * everything, including the `plainText`'d headline — a QUOTE, clamped here
 * and never re-cased or trimmed.
 *
 * ⚠ Topic draws as a lime PILL here and as plain lime TEXT on the rows —
 * the mock's own hierarchy: one pill per screen, on the lead.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Chevron, Pill, Text } from '@/components/atoms';
import { Colors, Radius, Spacing, Surfaces } from '@/constants/theme';

export interface NewsLeadCardProps {
  topic: string | null;
  publisher: string;
  /** Already derived — `3h`. */
  age: string;
  title: string;
  /** `copy.news.leadCta` — `Tap to read`. */
  ctaLabel: string;
  onPress: () => void;
}

export function NewsLeadCard({ topic, publisher, age, title, ctaLabel, onPress }: NewsLeadCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${publisher}`}
      accessibilityHint={ctaLabel}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.meta}>
        {topic ? <Pill label={topic} tone="accent" /> : null}
        <Text variant="eyebrowSm" color="textSecondary" numberOfLines={1} style={styles.publisher}>
          {publisher}
        </Text>
        <View style={styles.dot} />
        <Text variant="eyebrowSm" color="textFaint">
          {age}
        </Text>
      </View>
      <Text variant="leadHeadline" numberOfLines={3}>
        {title}
      </Text>
      <View style={styles.cta}>
        <Text variant="callout" color="accent">
          {ctaLabel}
        </Text>
        <Chevron direction="right" color="accent" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...Surfaces.glass,
    borderRadius: Radius.cardLg,
    padding: Spacing.five,
    gap: Spacing.three,
  },
  pressed: { opacity: 0.85 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minWidth: 0 },
  publisher: { flexShrink: 1, minWidth: 0 },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.dark.newsMetaDot },
  cta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});
