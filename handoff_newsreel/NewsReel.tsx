/**
 * News reel — full-screen vertical snap feed.
 * Reference implementation for the design in NEWS-REEL.md.
 *
 * The crown is PINNED and TRANSPARENT on this screen: one dark veil, no lime,
 * and therefore dark-theme ink (not the on-accent set).
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, Image, Pressable, FlatList, useWindowDimensions, StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export type NewsItem = {
  id: string;
  title: string;        // a QUOTE — never translated
  publisher: string;
  age: string;
  img: string;
  league: string;
  club?: string;        // which club it is ABOUT; drives the crest
};

/** The feed has no end: it rolls forward in laps, each lap a day older. */
const LAPS = ['', '1d', '2d', '3d', '4d', '5d'];

const CROWN_H = 196;
const CARD_TOP = 118;

export function NewsReel({
  items, crestUrl, onOpenStory, onShare, savedIds, onToggleSave, header,
}: {
  items: NewsItem[];
  crestUrl: (clubId: string) => string | null;
  onOpenStory: (id: string) => void;
  onShare: (id: string) => void;
  savedIds: string[];
  onToggleSave: (id: string) => void;
  header: React.ReactNode;   // back link + title + count + filter pill
}) {
  const { height } = useWindowDimensions();
  const cardH = height;      // measured scroll-area height in the real shell

  const data = useMemo(
    () => LAPS.flatMap((lapAge, lap) =>
      items.map(n => ({ ...n, key: `${n.id}-${lap}`, age: lapAge || n.age }))),
    [items],
  );

  const renderItem = useCallback(({ item }: { item: NewsItem & { key: string } }) => {
    const crest = item.club ? crestUrl(item.club) : null;
    const saved = savedIds.includes(item.id);
    return (
      <Pressable
        onPress={() => onOpenStory(item.id)}
        style={[styles.card, { height: cardH }]}
      >
        <Image source={{ uri: item.img }} style={styles.photo} />
        {/* No scrim: the photo is dimmed at source, the headline carries a shadow. */}
        <View style={styles.dim} />

        <View style={[styles.cardInner, { paddingTop: CARD_TOP }]}>
          <View style={styles.metaRow}>
            <BlurView intensity={24} tint="dark" style={styles.metaChip}>
              <Text style={styles.publisher}>{item.publisher}</Text>
              <View style={styles.metaDot} />
              <Text style={styles.age}>{item.age}</Text>
            </BlurView>
            {crest ? <Image source={{ uri: crest }} style={styles.crest} /> : null}
          </View>

          <View>
            <Text style={styles.headline}>{item.title}</Text>
            <View style={styles.actionRow}>
              <Text style={styles.readHint}>PULL UP TO READ</Text>
              <View style={styles.actions}>
                <Pressable
                  onPress={() => onToggleSave(item.id)}
                  hitSlop={8}
                  style={[styles.actionBtn, saved && styles.actionBtnOn]}
                />
                <Pressable onPress={() => onShare(item.id)} hitSlop={8} style={styles.actionBtn} />
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }, [cardH, crestUrl, onOpenStory, onShare, onToggleSave, savedIds]);

  return (
    <View style={styles.root}>
      <FlatList
        data={data}
        keyExtractor={it => it.key}
        renderItem={renderItem}
        pagingEnabled
        snapToInterval={cardH}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum   // one card per swipe, like scroll-snap-stop: always
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: cardH, offset: cardH * index, index })}
      />

      {/* Pinned, transparent crown. */}
      <View pointerEvents="box-none" style={styles.crown}>
        <LinearGradient
          colors={['rgba(6,10,8,.62)', 'rgba(6,12,11,.4)', 'rgba(6,12,12,.16)', 'rgba(15,19,22,0)']}
          locations={[0, 0.4, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.crownInner}>{header}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0e10' },
  card: { position: 'relative', overflow: 'hidden', backgroundColor: '#0b0e10' },
  photo: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', resizeMode: 'cover' },
  /* RN has no CSS filter — dim with an overlay at the same effective value. */
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,9,10,.38)' },
  cardInner: { flex: 1, paddingHorizontal: 20, paddingBottom: 26, justifyContent: 'space-between' },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 26,
    paddingHorizontal: 11, borderRadius: 13, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,.16)',
    backgroundColor: 'rgba(8,11,12,.42)',
  },
  publisher: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1.33, color: '#f4f6f6' },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.35)' },
  age: { fontSize: 9.5, fontWeight: '600', color: 'rgba(244,246,246,.62)' },
  crest: { width: 38, height: 38, resizeMode: 'contain' },
  headline: {
    fontSize: 31, lineHeight: 32.5, fontWeight: '700', letterSpacing: -1.09, color: '#fff',
    marginBottom: 20, textShadowColor: 'rgba(4,7,8,.72)', textShadowRadius: 22,
    textShadowOffset: { width: 0, height: 2 },
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  readHint: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.52, color: '#c8f25a' },
  actions: { flexDirection: 'row', gap: 9 },
  actionBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(8,11,12,.42)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,.16)',
  },
  actionBtnOn: { backgroundColor: 'rgba(200,242,90,.9)', borderColor: '#c8f25a' },
  crown: { position: 'absolute', left: 0, right: 0, top: 0, height: CROWN_H, zIndex: 12 },
  crownInner: { paddingTop: 4, paddingHorizontal: 20 },
});
