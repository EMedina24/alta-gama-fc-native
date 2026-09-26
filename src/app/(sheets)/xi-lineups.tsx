/**
 * A club's saved lineups (ADR 0214): load one onto the pitch, or delete it.
 * Declared in the ROOT stack (ADR 0030).
 *
 * ⚠ Delete asks first — it is the only copy, on this device only.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { XiLineupsSheet } from '@/components/organisms/xi-lineups-sheet';
import { actXi, squadIndex } from '@/features/starting-xi/act';
import { orbInitials } from '@/features/starting-xi/card-geometry';
import { FORMATION_SLOTS } from '@/features/starting-xi/slots';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useClubSquad } from '@/queries/use-club';
import { useClubXi } from '@/store/starting-xi';

export default function XiLineupsRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { copy, locale } = useI18n();
  const xi = copy.startingXi;
  const club = useClubXi(slug);
  const squad = useClubSquad(slug);
  const players = squad.data?.players ?? [];
  const byId = new Map(players.map((p) => [p.id, p]));
  const index = squadIndex(players);
  const date = new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short' });

  return (
    <XiLineupsSheet
      title={xi.lineupsTitle}
      lineups={club.lineups.map((lineup) => ({
        id: lineup.id,
        name: lineup.name,
        formation: lineup.formation,
        dots: FORMATION_SLOTS[lineup.formation].map((slot) => {
          const p = byId.get(lineup.placements[slot] ?? '');
          return p ? orbInitials(p) : null;
        }),
        date: date.format(new Date(lineup.savedAt)),
        loaded: lineup.id === club.loadedId,
      }))}
      empty={{ title: xi.noLineups, body: xi.noLineupsBody }}
      loadedLabel={xi.loaded}
      deleteLabel={xi.delete}
      onLoad={(id) => {
        actXi(slug, { type: 'loadLineup', id }, index);
        router.back();
      }}
      onDelete={(id) => {
        const lineup = club.lineups.find((l) => l.id === id);
        if (!lineup) return;
        Alert.alert(xi.deleteTitle, xi.deleteBody(lineup.name), [
          { text: xi.cancel, style: 'cancel' },
          { text: xi.delete, style: 'destructive', onPress: () => actXi(slug, { type: 'deleteLineup', id }, index) },
        ]);
      }}
      onClose={() => router.back()}
      closeLabel={copy.sheets.close}
    />
  );
}
