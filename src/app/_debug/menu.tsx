/**
 * League dropdown replay harness (ADR 0163). `altagamafc://_debug/menu`.
 *
 * The dropdown has produced three visual artifacts on CLOSE, each of them a few
 * frames long, and each one cost a cold launch and a lucky screenshot to see.
 * This is the tool that should have existed first: **Slow** multiplies the
 * transition so it can be stepped through with `simctl io screenshot`, and
 * **Replay** remounts the control on a key so there is no rebuild between tries.
 * The splash harness exists for exactly the same reason (ADR 0134).
 *
 * ⚠ It mounts a REAL `ScreenScaffold`, not a mock crown. The panel publishes to
 * the screen's overlay (`useScreenOverlay`), so a harness without a scaffold
 * would render a dead trigger — and the plumbing is half of what is under test.
 *
 * ⚠ It carries BOTH tones: the crown payload and a ground control low in the
 * body. The low one is the flip case — on Clubs the rows did not fit below the
 * trigger and the last league landed under the tab bar (ADR 0162).
 *
 * ⚠ The gallery cannot hold this control — its panel would hang over the next
 * `Case` — which is why it has its own route.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { LeagueMenu, type LeagueOption } from '@/components/molecules';
import { ScreenScaffold } from '@/components/templates/screen-scaffold';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/lib/i18n/use-i18n';

/**
 * Seven, which is what the Table carries and the count that broke the rail
 * (ADR 0160). ⚠ No artwork on purpose: this harness is about MOTION, and a
 * logo-less row exercises the branch that has no `logoUrl` at the same time.
 */
const LEAGUES: LeagueOption[] = [
  { slug: 'la-liga', name: 'LaLiga', logoUrl: null },
  { slug: 'champions-league', name: 'UEFA Champions League', logoUrl: null, mark: 'ucl' },
  { slug: 'premier-league', name: 'Premier League', logoUrl: null },
  { slug: 'bundesliga', name: 'Bundesliga', logoUrl: null },
  { slug: 'serie-a', name: 'Serie A', logoUrl: null },
  { slug: 'lpr-pro-clausura', name: 'LPR Clausura', logoUrl: null },
  { slug: 'liga-nacional-apertura', name: 'Liga Hondubet', logoUrl: null },
];

/** ×10 is enough to step a 160ms fade at `simctl`'s screenshot cadence. */
const SLOW = 10;

export default function MenuDebug() {
  const { copy } = useI18n();
  const [run, setRun] = useState(0);
  const [slow, setSlow] = useState(true);
  const [crownSlug, setCrownSlug] = useState(LEAGUES[0].slug);
  const [groundSlug, setGroundSlug] = useState(LEAGUES[1].slug);

  const scale = slow ? SLOW : 1;

  return (
    <ScreenScaffold
      title="Menu harness"
      eyebrow={`×${scale} · run ${run}`}
      subtitle="Open, then step the close with simctl io screenshot"
      payload={
        <LeagueMenu
          key={`crown-${run}-${scale}`}
          leagues={LEAGUES}
          active={crownSlug}
          onSelect={setCrownSlug}
          copy={copy.leagueMenu}
          tone="crown"
          motionScale={scale}
        />
      }>
      <View style={styles.buttons}>
        <Pressable style={styles.button} onPress={() => setRun((r) => r + 1)}>
          <Text variant="callout">Replay</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => setSlow((v) => !v)}>
          <Text variant="callout">{slow ? `Slow ×${SLOW}` : 'Real time'}</Text>
        </Pressable>
      </View>

      {/* ⚠ What the close artifacts were seen against: a page of content
          directly under the trigger. A harness on an empty screen would have
          shown none of them. */}
      {ROWS.map((n) => (
        <View key={n} style={styles.row}>
          <Text variant="body" color="textSecondary">{`Body row ${n} — the panel hangs over this`}</Text>
        </View>
      ))}

      {/* The GROUND tone, low enough on the page that the panel must flip UP. */}
      <LeagueMenu
        key={`ground-${run}-${scale}`}
        leagues={LEAGUES}
        active={groundSlug}
        onSelect={setGroundSlug}
        copy={copy.leagueMenu}
        motionScale={scale}
      />
      {ROWS.map((n) => (
        <View key={`tail-${n}`} style={styles.row}>
          <Text variant="body" color="textFaint">{`Tail row ${n}`}</Text>
        </View>
      ))}
    </ScreenScaffold>
  );
}

const ROWS = [1, 2, 3, 4, 5, 6];

const styles = StyleSheet.create({
  buttons: { flexDirection: 'row', gap: Spacing.three },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.control,
    backgroundColor: Colors.dark.glassFill,
    borderWidth: 1,
    borderColor: Colors.dark.glassLine,
  },
  row: {
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.hairline,
  },
});
