/**
 * The Formation sheet (ADR 0065). Writes the store; the builder underneath
 * re-renders through `useSyncExternalStore`, so the eleven re-seat live.
 * Declared in the ROOT stack (ADR 0030).
 */
import { useLocalSearchParams, useRouter } from 'expo-router';

import { XiShapeSheet } from '@/components/organisms/xi-shape-sheet';
import { useI18n } from '@/lib/i18n/use-i18n';
import { setFormation, useClubLineup } from '@/store/starting-xi';

export default function XiShapeRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { copy } = useI18n();
  const lineup = useClubLineup(slug);
  return (
    <XiShapeSheet
      current={lineup.formation}
      onPick={(f) => setFormation(slug, f)}
      title={copy.startingXi.shapeTitle}
      note={copy.startingXi.shapeNote}
      doneLabel={copy.startingXi.done}
      onDone={() => router.back()}
    />
  );
}
