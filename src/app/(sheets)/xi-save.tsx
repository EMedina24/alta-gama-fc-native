/**
 * Save the XI as one of the club's five lineups (ADR 0211, 0214). Declared in
 * the ROOT stack (ADR 0030).
 *
 * ⚠ Re-checks what Save needs — eleven, a keeper in goal, fewer than five
 * saved — because the header's lime circle is not the only way here: a deep
 * link can open this sheet over any pitch.
 *
 * ⚠ The id and the timestamp are made HERE, in the event handler, and passed
 * in: the reducer is pure (React Compiler).
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { XiSaveSheet } from '@/components/organisms/xi-save-sheet';
import { actXi, squadIndex } from '@/features/starting-xi/act';
import { MAX_LINEUPS, validateXi } from '@/features/starting-xi/xi-state';
import { displayName } from '@/lib/cronogol/derive';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useClubSquad } from '@/queries/use-club';
import { useClubXi } from '@/store/starting-xi';

/** A lineup name fits a card row. */
const NAME_MAX = 32;

export default function XiSaveRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { copy } = useI18n();
  const xi = copy.startingXi;
  const club = useClubXi(slug);
  const squad = useClubSquad(slug);
  const [name, setName] = useState('');

  const index = squadIndex(squad.data?.players ?? []);
  const ready = validateXi(club, index).ready;
  const blocked = !ready ? xi.saveHint : club.lineups.length >= MAX_LINEUPS ? xi.limitReached : null;
  const clubName = squad.data ? displayName(squad.data.team.name) : '';

  const save = () => {
    if (blocked) return;
    actXi(
      slug,
      {
        type: 'saveLineup',
        id: Date.now().toString(36),
        name: name.trim() || xi.lineupFallback(club.lineups.length + 1),
        savedAt: new Date().toISOString(),
      },
      index,
    );
    router.back();
  };

  return (
    <XiSaveSheet
      title={xi.saveTitle}
      meta={xi.saveMeta(clubName, club.formation)}
      value={name}
      onChange={setName}
      placeholder={xi.lineupFallback(club.lineups.length + 1)}
      maxLength={NAME_MAX}
      saveLabel={xi.save}
      blocked={blocked}
      onSave={save}
      onClose={() => router.back()}
      closeLabel={copy.sheets.close}
    />
  );
}
