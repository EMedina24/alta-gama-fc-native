/**
 * The Export sheet (ADR 0065). Declared in the ROOT stack (ADR 0030).
 *
 * ⚠ Renders nothing itself: `exportLineup` asks the BUILDER SCREEN (still
 * mounted under this sheet) to draw the card at true size and capture it —
 * see `features/starting-xi/export.ts`. The preview here is the same
 * `LineupCard` at sheet width.
 *
 * ⚠ Squad is a cache read (`useClubSquad`), like the player sheet.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { XiExportSheet } from '@/components/organisms/xi-export-sheet';
import { Colors } from '@/constants/theme';
import { DEFAULT_EXPORT_SIZE, type ExportSize } from '@/features/starting-xi/card-geometry';
import { exportLineup, type ExportKind } from '@/features/starting-xi/export';
import { visiblePlaced } from '@/features/starting-xi/lineup';
import { abbreviate, displayName } from '@/lib/cronogol/derive';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useClubSquad } from '@/queries/use-club';
import { setTitle, useClubLineup } from '@/store/starting-xi';

export default function XiExportRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { copy } = useI18n();
  const xi = copy.startingXi;
  const lineup = useClubLineup(slug);
  const squad = useClubSquad(slug);

  const [size, setSize] = useState<ExportSize>(DEFAULT_EXPORT_SIZE);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const byId = useMemo(() => new Map((squad.data?.players ?? []).map((p) => [p.id, p])), [squad.data]);
  const placed = useMemo(() => visiblePlaced(lineup.placed, new Set(byId.keys())), [lineup.placed, byId]);

  if (!squad.data) return null;
  const team = squad.data.team;

  const run = async (kind: ExportKind) => {
    setBusy(true);
    setStatus(null);
    try {
      const outcome = await exportLineup(kind, size);
      if (__DEV__) console.log('[xi-export]', kind, size, outcome);
      setStatus(outcome === 'saved' ? xi.saved : outcome === 'denied' ? xi.photosDenied : outcome === 'unavailable' ? xi.exportFailed : null);
    } catch (error) {
      // ⚠ Never a bare catch on a native promise (ADR 0073): the rejection
      // carries the module's own reason and it is the only diagnostic there is.
      if (__DEV__) console.error('[xi-export]', kind, size, error);
      setStatus(xi.exportFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
      <XiExportSheet
        card={{
          team: { name: displayName(team.name), crestUrl: team.crestUrl, abbr: abbreviate(team.name, team.slug, team.shortName) },
          title: lineup.title ?? xi.defaultTitle,
          formation: lineup.formation,
          look: lineup.look,
          placed,
          players: byId,
          labels: { cardLabel: xi.cardLabel, cardFormation: xi.cardFormation, cardUrl: xi.cardUrl },
        }}
        size={size}
        onSize={setSize}
        title={lineup.title ?? xi.defaultTitle}
        onTitle={(t) => setTitle(slug, t)}
        onSave={() => void run('save')}
        onShare={() => void run('share')}
        busy={busy}
        status={status}
        labels={{
          heading: xi.exportTitle,
          cardTitle: xi.cardTitleLabel,
          sizes: xi.sizeLabels,
          save: xi.save,
          share: xi.share,
          note: xi.exportNote,
          done: xi.done,
        }}
        onDone={() => router.back()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: Colors.dark.card },
});
