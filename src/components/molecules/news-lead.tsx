/**
 * The front page's lead (ADR 0070): the story's picture filling a 4:4.6 frame
 * under a scrim, with the kicker, the topic pill, a three-line headline, the
 * publisher's own two-line excerpt and the attribution line at the foot.
 *
 * `variant="compact"` is the Today card's lead (ADR 0071): the same picture
 * and scrim in a shorter 2:1.15 frame, a two-line `headline`, no kicker and no
 * excerpt, and NO Pressable of its own — the card is the tap target, so
 * `onPress` is omitted and the root is a plain View. The parent clips the
 * corners. One molecule for both so the scrim and the failure rule below can
 * never drift apart.
 *
 * ⚠ **A failed picture keeps the STORY, not the frame.** Hot-linked pictures
 * 404 and get hotlink-blocked; when that happens — or when there is none — the
 * same story renders as a text lead on the `card` ground. It never promotes
 * the next story into the slot, and it never draws an empty frame with a
 * headline under it.
 *
 * ⚠ The excerpt is the publisher's, already cut server-side. Clamped to two
 * lines by `numberOfLines`, never re-truncated (types.ts on `excerpt`).
 *
 * ⚠ Takes flat scalars, never an article (ADR 0013).
 */
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Eyebrow, Pill, Text, WashGradient } from '@/components/atoms';
import { Colors, NewsScrim, Radius, Size, Spacing } from '@/constants/theme';

import { NewsMeta } from './news-meta';

export interface NewsLeadProps {
  title: string;
  /** Shown on the page variant only. */
  excerpt?: string | null;
  imageUrl: string | null;
  topic: string | null;
  publisher: string;
  age: string;
  /** `LEAD` / `DESTACADO` — copy, not data. Omitted on the card. */
  kicker?: string | null;
  /** Omit when a parent is the tap target (the Today card). */
  onPress?: () => void;
  variant?: 'page' | 'compact';
}

export function NewsLead({
  title,
  excerpt = null,
  imageUrl,
  topic,
  publisher,
  age,
  kicker = null,
  onPress,
  variant = 'page',
}: NewsLeadProps) {
  const [failed, setFailed] = useState(false);
  const pictured = Boolean(imageUrl) && !failed;
  const compact = variant === 'compact';

  const frame = [
    styles.card,
    compact && styles.compact,
    pictured ? (compact ? styles.compactPictured : styles.pictured) : styles.text,
  ];

  const content = (
    <>
      {pictured ? (
        <>
          <Image
            source={{ uri: imageUrl ?? undefined }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
            onError={() => setFailed(true)}
            accessible={false}
          />
          <WashGradient
            angle="vertical"
            stops={[
              { offset: 0, color: NewsScrim.color, opacity: 0 },
              { offset: NewsScrim.clearTo, color: NewsScrim.color, opacity: 0 },
              { offset: NewsScrim.mid, color: NewsScrim.color, opacity: NewsScrim.midOpacity },
              { offset: 1, color: Colors.dark.card },
            ]}
          />
        </>
      ) : null}

      <View style={styles.body}>
        {kicker || topic ? (
          <View style={styles.kicker}>
            {kicker ? (
              <Eyebrow small color="accent">
                {kicker}
              </Eyebrow>
            ) : null}
            {topic ? <Pill label={topic} tone="accent" /> : null}
          </View>
        ) : null}
        {/* The page's headline is `title`; the card's is `headline` on a
            picture and `title3` without one — a 17pt line alone on a bare card
            ground read as a row, not a lead. */}
        <Text
          variant={compact ? (pictured ? 'headline' : 'title3') : 'title'}
          numberOfLines={compact && pictured ? 2 : 3}>
          {title}
        </Text>
        {excerpt && !compact ? (
          <Text variant="footnote" color="textSecondary" numberOfLines={2}>
            {excerpt}
          </Text>
        ) : null}
        {/* Topic already sits in the kicker row — the meta line carries only
            publisher · age here. */}
        <NewsMeta topic={null} publisher={publisher} age={age} />
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View style={frame} accessible={false}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${publisher}`}
      style={({ pressed }) => [...frame, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.dark.card,
  },
  /** The picture fills the frame; the body is pinned to its foot. */
  pictured: { aspectRatio: Size.newsLeadRatio, justifyContent: 'flex-end' },
  compactPictured: { aspectRatio: Size.newsCardLeadRatio, justifyContent: 'flex-end' },
  /** The card clips the corners; a radius here would double up with its own. */
  compact: { borderRadius: 0 },
  /** No picture: the same body on the card ground, with room above it. */
  text: { paddingTop: Spacing.six },
  pressed: { opacity: 0.85 },
  body: { padding: Spacing.four, gap: Spacing.two },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
