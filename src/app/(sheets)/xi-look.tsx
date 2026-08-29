/** The Pitch (look) sheet (ADR 0065). Declared in the ROOT stack (ADR 0030). */
import { useLocalSearchParams, useRouter } from 'expo-router';

import { XiLookSheet } from '@/components/organisms/xi-look-sheet';
import { useI18n } from '@/lib/i18n/use-i18n';
import { setLook, useClubLineup } from '@/store/starting-xi';

export default function XiLookRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { copy } = useI18n();
  const lineup = useClubLineup(slug);
  return (
    <XiLookSheet
      current={lineup.look}
      onPick={(look) => setLook(slug, look)}
      title={copy.startingXi.lookTitle}
      labels={copy.startingXi.looks}
      doneLabel={copy.startingXi.done}
      onDone={() => router.back()}
    />
  );
}
