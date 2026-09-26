/**
 * The fifth tab: the Starting XI builder (ADR 0212) — `/starting-xi`, the
 * web's own path for its nav entry.
 *
 * Opens on the reader's last club, then their favourite, then their first
 * followed club that has a squad (`resolveXiClub`); with none, it offers the
 * club sheet. `?club=slug` on a deep link opens on that club.
 *
 * ⚠ A thin shell: the data is `useXiScreen`, the layout is the template. The
 * builder pushed from a club page (`/club/[slug]/starting-xi`) is the same
 * pair with the club fixed — two routes, one screen.
 */
import { StartingXiScreen } from '@/components/templates/starting-xi-screen';
import { useXiScreen } from '@/features/starting-xi/use-xi-screen';

export default function StartingXiTab() {
  const { model, actions } = useXiScreen('tab', null);
  return <StartingXiScreen model={model} actions={actions} />;
}
