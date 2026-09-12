/**
 * The Champions League calendar — TWO feeds behind one entry point (ADR 0157).
 *
 * ⚠⚠ **The two scopes are not interchangeable, which is why the choice exists
 * at all.** A knockout tie carries no matchday, so the round feed structurally
 * cannot reach one; the season feed is the only path to them. Never present
 * this as a convenience toggle — the copy states the difference in both scopes.
 *
 * ⚠ The round scope is the default because the reader arrives from a round.
 * Landing them on the season feed would answer a question they did not ask.
 */
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { CalendarSheet } from '@/components/organisms/calendar-sheet';
import { uclJornadaFeedUrl, uclSeasonFeedUrl } from '@/lib/cronogol/feed';
import { SEASON } from '@/lib/cronogol/leagues';
import { useI18n } from '@/lib/i18n/use-i18n';

type Scope = 'round' | 'season';

export default function UclCalendarRoute() {
  const { matchday } = useLocalSearchParams<{ matchday: string }>();
  const { copy } = useI18n();
  const [scope, setScope] = useState<Scope>('round');
  const n = Number(matchday);

  /**
   * ⚠ A matchday we cannot parse falls back to the SEASON feed rather than
   * minting `…/jornada/2026/NaN.ics`, which the backend answers with a 400.
   * The reader still gets a working calendar; they just get the bigger one.
   */
  const round = Number.isFinite(n) && n > 0;
  const showing: Scope = round ? scope : 'season';

  return (
    <CalendarSheet
      title={showing === 'season' ? copy.sheets.uclSeasonTitle : copy.sheets.uclRoundTitle(n)}
      body={showing === 'season' ? copy.sheets.uclSeasonBody : copy.sheets.uclRoundBody}
      feedUrl={
        showing === 'season' ? uclSeasonFeedUrl(SEASON) : uclJornadaFeedUrl(SEASON, n)
      }
      // ⚠ Hidden when there is no round to offer — a control with one reachable
      // option is furniture that lies about being a choice.
      scope={
        round
          ? {
              options: [
                { value: 'round', label: copy.sheets.uclScopeRound },
                { value: 'season', label: copy.sheets.uclScopeSeason },
              ],
              value: scope,
              onChange: (v) => setScope(v as Scope),
              accessibilityLabel: copy.sheets.uclScopeLabel,
            }
          : undefined
      }
      copy={copy.sheets}
    />
  );
}
