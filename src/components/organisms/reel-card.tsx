/**
 * One story, one viewport — the reel's full-screen card (ADR 0129).
 *
 * ⚠ Flat scalars only (ADR 0013): the screen derives everything; this draws.
 *
 * ⚠ The photo is dimmed by the `reelDim` OVERLAY, not a filter (RN has none),
 * and there is NO bottom scrim — the spec forbids the gradient band twice.
 * Legibility is the dim plus the headline's own shadow.
 *
 * ⚠ The IMAGELESS branch is a designed card, not a failure state: `reelGround`
 * with the `ReelFallbackPool` teal pool behind pure type. Publisher images are
 * hot-linked and 404 at will (one in fifty has none) — on a photo-first screen
 * that branch is routine, so `onError` flips to it without any reflow.
 *
 * ⚠ a11y: the CARD Pressable is `accessible={false}` so VoiceOver reaches the
 * save/share buttons inside it; the headline itself is the "open" element.
 */
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RiseGlyph, Text, WashRadial } from '@/components/atoms';
import { ReelActions } from '@/components/molecules/reel-actions';
import { ReelMetaChip } from '@/components/molecules/reel-meta-chip';
import { Colors, ReelFallbackPool, Size, Spacing } from '@/constants/theme';

export interface ReelCardProps {
  title: string;
  imageUrl: string | null;
  publisher: string;
  /** Already derived — `3h`. */
  age: string;
  saved: boolean;
  /** The measured scroll-area height — every card is exactly one viewport. */
  height: number;
  /** `PULL UP TO READ` — furniture, from `copy.news.reelRead`. */
  hint: string;
  saveLabel: string;
  savedLabel: string;
  shareLabel: string;
  /**
   * The screen's safe-area insets. ⚠ `topInset` rides ON TOP of
   * `Size.reelCardTop`: the mock's 118px was measured inside a scroller that
   * began BELOW the status bar, and these cards fill the whole window — without
   * the inset the meta chip drew behind the crown title (seen 2026-09-06).
   * `bottomInset` keeps the actions off the home bar.
   */
  topInset: number;
  bottomInset: number;
  onPress: () => void;
  onToggleSave: () => void;
  onShare: () => void;
}

export function ReelCard({
  title,
  imageUrl,
  publisher,
  age,
  saved,
  height,
  hint,
  saveLabel,
  savedLabel,
  shareLabel,
  topInset,
  bottomInset,
  onPress,
  onToggleSave,
  onShare,
}: ReelCardProps) {
  const [failed, setFailed] = useState(false);
  const photo = imageUrl !== null && !failed;

  return (
    <Pressable onPress={onPress} accessible={false} style={[styles.card, { height }]}>
      {photo ? (
        <>
          <Image
            source={{ uri: imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
            onError={() => setFailed(true)}
            accessible={false}
          />
          <View style={styles.dim} />
        </>
      ) : (
        <WashRadial
          cx={ReelFallbackPool.cx}
          cy={ReelFallbackPool.cy}
          rx={ReelFallbackPool.rx}
          ry={ReelFallbackPool.ry}
          stops={[
            { offset: 0, color: ReelFallbackPool.color, opacity: ReelFallbackPool.alpha },
            { offset: ReelFallbackPool.fade, color: ReelFallbackPool.color, opacity: 0 },
          ]}
        />
      )}

      <View
        style={[
          styles.inner,
          {
            paddingTop: Size.reelCardTop + topInset,
            paddingBottom: Size.reelCardBottom + bottomInset,
          },
        ]}>
        <ReelMetaChip publisher={publisher} age={age} />
        <View>
          <Text
            variant="reelHeadline"
            style={styles.headline}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${title}, ${publisher}`}
            accessibilityHint={hint}>
            {title}
          </Text>
          <View style={styles.footRow}>
            <View style={styles.hintRow}>
              <RiseGlyph size={15} />
              <Text variant="reelHint" color="accent" numberOfLines={1} style={styles.hintText}>
                {hint}
              </Text>
            </View>
            <ReelActions
              saved={saved}
              onToggleSave={onToggleSave}
              onShare={onShare}
              saveLabel={saveLabel}
              savedLabel={savedLabel}
              shareLabel={shareLabel}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', backgroundColor: Colors.dark.reelGround },
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.dark.reelDim,
  },
  inner: {
    flex: 1,
    paddingHorizontal: Spacing.five,
    justifyContent: 'space-between',
  },
  headline: {
    // lineHeight is the spec's 31×1.05; shadow radius/offset ride beside their
    // colour token (`reelHeadlineShadow` documents the triple).
    lineHeight: 33,
    color: Colors.dark.reelInk,
    marginBottom: Spacing.five,
    textShadowColor: Colors.dark.reelHeadlineShadow,
    textShadowRadius: 22,
    textShadowOffset: { width: 0, height: 2 },
  },
  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + Spacing.half, minWidth: 0 },
  hintText: { flexShrink: 1 },
});
