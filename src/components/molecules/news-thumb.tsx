/**
 * A story's picture in a fixed square.
 *
 * ⚠ "No image is a layout, not a hole." Aggregated pictures are hot-linked to
 * the publisher's CDN and can 404 or be hotlink-blocked at any time, and about
 * one story in fifty has none — so the frame is always drawn at its size on
 * the raised ground, and a failed load simply leaves the ground showing. The
 * headline beside it never reflows. Never proxy or re-host a publisher's image.
 */
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

export interface NewsThumbProps {
  src: string | null;
  size: number;
}

export function NewsThumb({ src, size }: NewsThumbProps) {
  const [failed, setFailed] = useState(false);
  const frame = { width: size, height: size };

  return (
    <View style={[styles.frame, frame]}>
      {src && !failed ? (
        <Image
          source={{ uri: src }}
          style={frame}
          contentFit="cover"
          transition={150}
          onError={() => setFailed(true)}
          accessible={false}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: Radius.chip,
    overflow: 'hidden',
    backgroundColor: Colors.dark.raised,
    flexShrink: 0,
  },
});
