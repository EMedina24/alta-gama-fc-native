/**
 * Dev tool: what the widgets can actually see.
 *
 * ⚠ Dev-only (the `_debug` layout redirects in release). Reach it at
 * `/_debug/widgets` — `_debug/index.tsx` is the Phase 1 gate, not a menu.
 *
 * ⚠⚠ **This is the whole point of the screen: the widget contract is a FILE in
 * another process's container, and nothing else in the app can show you whether
 * it landed.** Everything a widget draws is below — the snapshot exactly as
 * written, and whether the crest PNGs it will look for are on disk. If the
 * container row says `null`, stop: the App Group is not provisioned on this
 * build and no amount of Swift debugging will help.
 */
import { Directory, File } from 'expo-file-system';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/atoms';
import { APP_GROUP, groupContainer } from '@/features/app-group';
import { WIDGETS_AVAILABLE, reloadWidgets } from '@/features/push/capability';
import { buildSnapshot, snapshotFile, type WidgetSnapshot } from '@/features/widgets/snapshot';
import { applyWidgetSnapshot, forgetWidgetSnapshot } from '@/features/widgets/sync';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatWidgetKickoff } from '@/lib/format';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useWidgetWindow } from '@/queries/use-today';
import { usePreferences, useZone } from '@/store/preferences';

export default function DebugWidgets() {
  const prefs = usePreferences();
  const zone = useZone();
  const { copy, locale, phrases } = useI18n();
  const widgetWindow = useWidgetWindow(zone);

  const [onDisk, setOnDisk] = useState<string>('…');
  const [written, setWritten] = useState<string>('…');
  const [crests, setCrests] = useState<string[]>([]);
  const [status, setStatus] = useState('idle');

  const container = groupContainer();

  // The snapshot this device WOULD write right now — pure, so it renders even
  // with no container at all.
  const built: WidgetSnapshot | null = widgetWindow.data
    ? buildSnapshot(widgetWindow.data.fixtures, prefs.followed, new Date(), copy, (iso) =>
        formatWidgetKickoff(iso, zone, prefs.clock, phrases),
      )
    : null;

  /**
   * ⚠ Every `setState` here happens AFTER an await, and the read itself lives
   * outside the component. A `setState` called synchronously inside an effect is
   * a lint error in this repo (`react-hooks/set-state-in-effect`) because it can
   * cascade renders — and reading a file synchronously on the JS thread is worth
   * avoiding regardless.
   */
  const inspect = useCallback(async () => {
    const next = await readContainer();
    setOnDisk(next.summary);
    setWritten(next.written);
    setCrests(next.crests);
  }, []);

  // ⚠ `react-hooks/set-state-in-effect` fires on any effect that reaches a
  // `setState`, however many awaits deep — and reading another process's
  // container on mount is exactly the "subscribe to an external system" case the
  // rule's own documentation allows. `_debug/push.tsx` has the same shape for
  // the same reason. Disabled here rather than left as a standing error, so the
  // next person running `expo lint` inherits one fewer.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void inspect();
  }, [inspect]);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text variant="title">Widgets</Text>

      <Row label="WIDGETS_AVAILABLE" value={String(WIDGETS_AVAILABLE)} />
      <Row label="app group" value={APP_GROUP} />
      {/* ⚠ The single most important row. `null` here means every other row is
          noise — see the file header. */}
      <Row label="container" value={container ? 'resolved' : 'null'} />
      <Row label="locale · zone · clock" value={`${locale} · ${zone} · ${prefs.clock}h`} />
      <Row label="followed clubs" value={String(prefs.followed.length)} />
      <Row
        label="window (21d)"
        value={
          widgetWindow.data
            ? `${widgetWindow.data.count} fixtures · ${widgetWindow.data.leagues.length} leagues`
            : widgetWindow.isLoading
              ? 'loading…'
              : 'error'
        }
      />
      <Row label="snapshot on disk" value={onDisk} />
      <Row label="written at" value={written} />
      <Row label="status" value={status} />

      <Text variant="eyebrowSm" color="textFaint">
        Crest files in the App Group (✗ is normal for Bundesliga and Serie A)
      </Text>
      <View style={styles.box}>
        <Text variant="micro" color="textSecondary" style={styles.mono}>
          {crests.length ? crests.join('\n') : '(none)'}
        </Text>
      </View>

      <Text variant="eyebrowSm" color="textFaint">
        Snapshot as it would be written now
      </Text>
      <View style={styles.box}>
        <Text variant="micro" color="textSecondary" style={styles.mono}>
          {built ? JSON.stringify(built, null, 1) : '(window not loaded)'}
        </Text>
      </View>

      <Button
        label="Write snapshot + reload widgets"
        tone="secondary"
        onPress={async () => {
          if (!built) return;
          setStatus('writing…');
          // ⚠ Force it: the real path skips an unchanged snapshot, which is
          // exactly what you do NOT want from a button labelled "write".
          forgetWidgetSnapshot();
          await applyWidgetSnapshot(built);
          setStatus('written');
          await inspect();
        }}
      />
      <Button
        label="Reload widgets only"
        tone="quiet"
        onPress={async () => {
          await reloadWidgets();
          setStatus('reload requested');
        }}
      />
      <Button label="Re-inspect" tone="quiet" onPress={() => void inspect()} />
    </ScrollView>
  );
}

/**
 * What is actually in the App Group right now.
 *
 * ⚠ Reads back from DISK and never re-serialises the in-memory snapshot. The
 * whole question this screen answers is whether the write landed; printing the
 * object we would have written answers a different one.
 */
async function readContainer(): Promise<{
  summary: string;
  written: string;
  crests: string[];
}> {
  const file = snapshotFile();
  if (!file) return { summary: '(no App Group container)', written: '—', crests: [] };
  if (!file.exists) return { summary: '(not written yet)', written: '—', crests: [] };

  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw) as WidgetSnapshot;
    const directory = groupContainer();

    return {
      // ⚠ Two fields, not one string. Joined, this runs off the right edge of
      // the row and the tail is invisible — on a screen whose whole job is to
      // show you the thing you cannot otherwise see.
      summary: `${raw.length} B · v${parsed.v} · ${parsed.entries.length} entries`,
      written: parsed.writtenAt.replace('T', ' ').replace(/\.\d+Z$/, 'Z'),
      crests: parsed.entries.map((entry) => {
        if (!directory) return `${entry.fixtureId} — no container`;
        const folder = new Directory(directory, 'crests', entry.fixtureId);
        const home = new File(folder, 'home.png');
        const away = new File(folder, 'away.png');
        return `${entry.opponentAbbr.padEnd(4)} home:${home.exists ? '✓' : '✗'} away:${away.exists ? '✓' : '✗'}`;
      }),
    };
  } catch (error) {
    return {
      summary: `unreadable: ${error instanceof Error ? error.message : String(error)}`,
      written: '—',
      crests: [],
    };
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="footnote" color="textSecondary">
        {label}
      </Text>
      <Text variant="footnote" color="accent" style={styles.mono}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: Spacing.five, paddingTop: Spacing.eight * 2, gap: Spacing.three },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  box: {
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  mono: { fontFamily: 'Menlo' },
});
