/**
 * The Starting XI entry on the club page (ADR 0065).
 *
 * ⚠ **The row itself now lives in `action-row.tsx`** (ADR 0141): Season stats
 * added a second row directly under this one with the same shell, and two
 * copies of a shell drift. This file is the pitch glyph plus the name the
 * older call site knows it by; everything else — geometry, press ground,
 * the `enabled: false` contract — is `ActionRow`'s and documented there.
 */
import { PitchGlyph } from '@/components/atoms';
import { ActionRow } from './action-row';

export interface StartingXiRowProps {
  enabled: boolean;
  title: string;
  /** The promise when enabled, the `squadEmpty` explanation when not. */
  body: string;
  onPress: () => void;
}

export function StartingXiRow({ enabled, title, body, onPress }: StartingXiRowProps) {
  return (
    <ActionRow
      enabled={enabled}
      title={title}
      body={body}
      glyph={(color, size) => <PitchGlyph size={size} color={color} />}
      onPress={onPress}
    />
  );
}
