/**
 * The reel's save bookmark (ADR 0129). Drawn, not a font glyph — there is no
 * icon set in this app (see `chevron.tsx`). Path is the dc handoff's, verbatim.
 *
 * ⚠ `saved` flips the FILL, not just the stroke: inside the lime circle the
 * mark is solid `onAccent`; unsaved it is a stroked outline in `text`.
 * ⚠ Not a hit target — the 44pt circle in `ReelActions` owns the Pressable.
 */
import Svg, { Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';

export interface BookmarkGlyphProps {
  saved?: boolean;
  size?: number;
}

export function BookmarkGlyph({ saved = false, size = 15 }: BookmarkGlyphProps) {
  const ink = Colors.dark[saved ? 'onAccent' : 'text'];
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" accessible={false}>
      <Path
        d="M3.5 2.2h9v11.6L8 10.4l-4.5 3.4z"
        stroke={ink}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={saved ? ink : 'none'}
      />
    </Svg>
  );
}
