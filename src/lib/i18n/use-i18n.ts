/**
 * The active locale and its phrase table.
 *
 * ⚠ Unlike the web app, language is NOT a route segment here. There is no URL to
 * share, so there is nothing for a path to be the authority over — it is a
 * device preference, and switching it re-renders in place rather than
 * navigating. That is why `swapLocale`/`negotiateLocale` did not port.
 */
import { COPY, type Copy } from './copy';
import { PHRASES, type Locale, type Phrases } from './phrases';
import { useLocale } from '@/store/preferences';

export function useI18n(): { locale: Locale; phrases: Phrases; copy: Copy } {
  const locale = useLocale();
  return { locale, phrases: PHRASES[locale], copy: COPY[locale] };
}
