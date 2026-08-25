/**
 * A matchday feed.
 *
 * ⚠ Separate from, and additive to, a club subscription — the copy says so,
 * because "both can be on" is the thing readers get wrong.
 */
import { useLocalSearchParams } from 'expo-router';

import { CalendarSheet } from '@/components/organisms/calendar-sheet';
import { jornadaFeedUrl } from '@/lib/cronogol/feed';
import { SEASON } from '@/lib/cronogol/leagues';
import { useI18n } from '@/lib/i18n/use-i18n';

export default function JornadaCalendarRoute() {
  const { league, matchweek } = useLocalSearchParams<{ league: string; matchweek: string }>();
  const { copy } = useI18n();
  const n = Number(matchweek);

  return (
    <CalendarSheet
      title={copy.sheets.jornadaTitle(n)}
      body={copy.sheets.jornadaBody}
      feedUrl={jornadaFeedUrl(league, SEASON, n)}
      copy={copy.sheets}
    />
  );
}
