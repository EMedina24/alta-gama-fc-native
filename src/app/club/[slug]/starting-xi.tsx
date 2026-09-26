/**
 * The Starting XI builder, pushed from a club page's Squad segment
 * (ADR 0065, 0212) — `/club/[slug]/starting-xi`.
 *
 * The same screen as the fifth tab with the club FIXED from the route: a back
 * circle instead of the club switcher, because this builder belongs to the page
 * it was opened from. The row that opens it has already made this club the
 * tab's `lastClub`, so the tab opens here next time too.
 *
 * ⚠ No native header — the screen's own header row carries the back circle,
 * and swipe-back is the stack's gesture, not the header's.
 */
import { Stack, useLocalSearchParams } from 'expo-router';

import { StartingXiScreen } from '@/components/templates/starting-xi-screen';
import { useXiScreen } from '@/features/starting-xi/use-xi-screen';

export default function ClubStartingXi() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { model, actions } = useXiScreen('club', slug ?? null);
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StartingXiScreen model={model} actions={actions} />
    </>
  );
}
