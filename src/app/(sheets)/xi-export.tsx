/**
 * The Export sheet (ADR 0065). Declared in the ROOT stack (ADR 0030).
 *
 * ⚠ Renders nothing itself: `exportLineup` asks the BUILDER SCREEN (still
 * mounted under this sheet) to draw the card at true size and capture it —
 * see `features/starting-xi/export.ts`. The preview here is the same
 * `LineupCard` at sheet width.
 *
 * ⚠ `host` names WHICH builder: the tab's stays mounted under one pushed from a
 * club page, and each registers its own capture (ADR 0214).
 *
 * ⚠ Squad is a cache read (`useClubSquad`), like the player sheet.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { SHEET_GROUND } from '@/components/atoms';
import { XiExportSheet, type ExportStatus } from '@/components/organisms/xi-export-sheet';
import { DEFAULT_EXPORT_SIZE, type ExportSize } from '@/features/starting-xi/card-geometry';
import { exportLineup, isXiHost, type ExportKind } from '@/features/starting-xi/export';
import { hapticSaved } from '@/lib/haptics';
import { abbreviate, displayName } from '@/lib/cronogol/derive';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useClubSquad } from '@/queries/use-club';
import { setXiTitle, useClubXi } from '@/store/starting-xi';

export default function XiExportRoute() {
  const { slug, host } = useLocalSearchParams<{ slug: string; host?: string }>();
  const router = useRouter();
  const { copy } = useI18n();
  const xi = copy.startingXi;
  const lineup = useClubXi(slug);
  const squad = useClubSquad(slug);

  const [size, setSize] = useState<ExportSize>(DEFAULT_EXPORT_SIZE);
  const [busy, setBusy] = useState(false);
  // ⚠ Typed, and CLEARED by every handler that changes what the PNG would be
  // (size, title) — that is what re-arms the Save button after a save. No
  // effect: the resets live in the handlers that cause them (ADR 0074).
  const [status, setStatus] = useState<ExportStatus | null>(null);

  const byId = useMemo(() => new Map((squad.data?.players ?? []).map((p) => [p.id, p])), [squad.data]);
  // Only players still in the squad are drawn; a departed one leaves a slot empty.
  const placements = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [slot, id] of Object.entries(lineup.placements)) if (byId.has(id)) out[slot] = id;
    return out;
  }, [lineup.placements, byId]);

  if (!squad.data) return null;
  const team = squad.data.team;

  const run = async (kind: ExportKind) => {
    setBusy(true);
    setStatus(null);
    try {
      const outcome = await exportLineup(isXiHost(host) ? host : 'tab', kind, size);
      if (__DEV__) console.log('[xi-export]', kind, size, outcome);
      if (outcome === 'saved') {
        void hapticSaved();
        setStatus({ kind: 'saved', text: xi.saved });
      } else if (outcome === 'denied') {
        setStatus({ kind: 'denied', text: xi.photosDenied });
      } else if (outcome === 'unavailable') {
        setStatus({ kind: 'failed', text: xi.exportFailed });
      } else {
        // `shared`: the system sheet was the receipt.
        setStatus(null);
      }
    } catch (error) {
      // ⚠ Never a bare catch on a native promise (ADR 0073): the rejection
      // carries the module's own reason and it is the only diagnostic there is.
      if (__DEV__) console.error('[xi-export]', kind, size, error);
      setStatus({ kind: 'failed', text: xi.exportFailed });
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
          placements,
          players: byId,
          labels: { cardLabel: xi.cardLabel, cardFormation: xi.cardFormation, cardUrl: xi.cardUrl },
        }}
        size={size}
        onSize={(s) => {
          setSize(s);
          setStatus(null);
        }}
        title={lineup.title ?? xi.defaultTitle}
        onTitle={(t) => {
          setXiTitle(slug, t);
          setStatus(null);
        }}
        onSave={() => void run('save')}
        onShare={() => void run('share')}
        busy={busy}
        status={status}
        labels={{
          heading: xi.exportTitle,
          cardTitle: xi.cardTitleLabel,
          sizes: xi.sizeLabels,
          save: xi.savePhotos,
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
  scroll: { backgroundColor: SHEET_GROUND },
});
