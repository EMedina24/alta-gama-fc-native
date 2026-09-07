/**
 * The reel's scroller (ADR 0129): a FlatList of full-viewport cards, one story
 * per swipe.
 *
 * ⚠ The snap recipe is the handoff's RN reference, verbatim: `pagingEnabled` +
 * `snapToInterval={cardHeight}` + `disableIntervalMomentum` is the RN spelling
 * of `scroll-snap-stop: always` — exactly one card per flick, however hard.
 * `getItemLayout` shares the SAME `cardHeight` the cards draw at; the screen
 * measures it once and gates the first render on it, so the two never disagree
 * (a half-visible drifted card is what disagreement looks like).
 *
 * ⚠ Fetches nothing (ADR 0013). Callbacks carry the story's session `id` back
 * to the screen, which owns the article and the branch on it.
 *
 * ⚠ `windowSize` is small on purpose: every row is a screen-sized photo, and
 * the default 21 viewports of decoded images is a memory bill nothing here
 * wants to pay.
 */
import { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Text, WashRadial } from '@/components/atoms';
import { ReelCard } from '@/components/organisms/reel-card';
import { Colors, ReelFallbackPool, Spacing } from '@/constants/theme';

export interface ReelItem {
  /** FlatList key only — session-lived, never persisted (ids purge at 30 days). */
  id: string;
  title: string;
  imageUrl: string | null;
  publisher: string;
  /** Already derived — `3h`. */
  age: string;
  saved: boolean;
}

export interface NewsReelProps {
  items: readonly ReelItem[];
  /** The measured scroll-area height — the screen's `onLayout`, nothing else. */
  cardHeight: number;
  /** False once `nextBefore` came back null — appends the caught-up card. */
  hasMore: boolean;
  onEndReached: () => void;
  /** `copy.news.caughtUp`. */
  endTitle: string;
  /** `copy.news.reelRead`, and the three action labels. */
  hint: string;
  saveLabel: string;
  savedLabel: string;
  shareLabel: string;
  topInset: number;
  bottomInset: number;
  onOpen: (id: string) => void;
  onToggleSave: (id: string) => void;
  onShare: (id: string) => void;
}

/** The caught-up card rides the list under a key no article can collide with. */
const END_KEY = '__end__';

type Row = ReelItem | { id: typeof END_KEY };

function isEnd(row: Row): row is { id: typeof END_KEY } {
  return row.id === END_KEY;
}

export function NewsReel({
  items,
  cardHeight,
  hasMore,
  onEndReached,
  endTitle,
  hint,
  saveLabel,
  savedLabel,
  shareLabel,
  topInset,
  bottomInset,
  onOpen,
  onToggleSave,
  onShare,
}: NewsReelProps) {
  const data: Row[] = hasMore || items.length === 0 ? [...items] : [...items, { id: END_KEY }];

  const renderItem = useCallback(
    ({ item }: { item: Row }) => {
      if (isEnd(item)) {
        return (
          <View style={[styles.end, { height: cardHeight }]}>
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
            <Text variant="body" color="textDim" center style={styles.endText}>
              {endTitle}
            </Text>
          </View>
        );
      }
      return (
        <ReelCard
          title={item.title}
          imageUrl={item.imageUrl}
          publisher={item.publisher}
          age={item.age}
          saved={item.saved}
          height={cardHeight}
          hint={hint}
          saveLabel={saveLabel}
          savedLabel={savedLabel}
          shareLabel={shareLabel}
          topInset={topInset}
          bottomInset={bottomInset}
          onPress={() => onOpen(item.id)}
          onToggleSave={() => onToggleSave(item.id)}
          onShare={() => onShare(item.id)}
        />
      );
    },
    [cardHeight, hint, saveLabel, savedLabel, shareLabel, topInset, bottomInset, onOpen, onToggleSave, onShare, endTitle],
  );

  return (
    <FlatList
      data={data}
      keyExtractor={(row) => row.id}
      renderItem={renderItem}
      pagingEnabled
      snapToInterval={cardHeight}
      snapToAlignment="start"
      decelerationRate="fast"
      // One card per swipe, like `scroll-snap-stop: always`.
      disableIntervalMomentum
      showsVerticalScrollIndicator={false}
      getItemLayout={(_, index) => ({ length: cardHeight, offset: cardHeight * index, index })}
      onEndReached={onEndReached}
      onEndReachedThreshold={2}
      windowSize={5}
    />
  );
}

const styles = StyleSheet.create({
  end: {
    backgroundColor: Colors.dark.reelGround,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endText: { paddingHorizontal: Spacing.six },
});
