/**
 * The News save bookmark (ADR 0129, kept by 0130): the header's Saved doorway
 * and the Saved screen's un-save control. Drawn, not a font glyph — there is
 * no icon set in this app (see `chevron.tsx`).
 *
 * ⚠ `saved` flips the FILL, not just the stroke: inside the lime circle the
 * mark is solid `onAccent`; unsaved it is a stroked outline in `color`.
 * ⚠ Not a hit target — the 44pt (`Size.newsAction`) circle around it owns
 * the Pressable.
 */
import Svg, { Path } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export interface BookmarkGlyphProps {
  saved?: boolean;
  size?: number;
  /** The UNSAVED stroke — `text` on a card, `onCrown` on the crown band. */
  color?: ThemeColor;
}

export function BookmarkGlyph({ saved = false, size = 15, color = 'text' }: BookmarkGlyphProps) {
  const ink = Colors.dark[saved ? 'onAccent' : color];
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
