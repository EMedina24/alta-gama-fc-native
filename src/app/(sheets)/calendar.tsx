/** A club's season feed. Reached from the club page's Calendar button. */
import { useLocalSearchParams } from 'expo-router';

import { CalendarSheet } from '@/components/organisms/calendar-sheet';
import { clubFeedUrl } from '@/lib/cronogol/feed';
import { displayName } from '@/lib/cronogol/derive';
import { useI18n } from '@/lib/i18n/use-i18n';

export default function CalendarSheetRoute() {
  const { slug, name } = useLocalSearchParams<{ slug: string; name?: string }>();
  const { copy } = useI18n();

  return (
    <CalendarSheet
      title={copy.sheets.calendarTitle(displayName(name ?? slug))}
      body={copy.sheets.calendarBody}
      feedUrl={clubFeedUrl(slug)}
      copy={copy.sheets}
    />
  );
}
