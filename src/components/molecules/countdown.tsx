/**
 * "1d 18h 04m 12s" until a kickoff, ticking once a second (ADR 0034).
 *
 * ⚠ The seconds tick is deliberate and it is what makes the card feel live —
 * an earlier build ticked per minute and the lead card read as a screenshot.
 * The cost of waking the JS thread 60× more often is paid down three ways, and
 * removing any of them puts it back:
 *   1. The timer is torn down whenever the app leaves `active`. iOS suspends JS
 *      timers in the background anyway; without the listener the card returns
 *      from a resume showing the number it was suspended on.
 *   2. Each tick is scheduled to the next WALL second (`SECOND - now % SECOND`),
 *      so the digit flips with the system clock and never drifts.
 *   3. The loop stops at kickoff. Nothing schedules past `target`.
 *
 * ⚠ Never rendered for a `kickoffTbd` fixture — that timestamp is midnight UTC
 * standing in for "a date, time unknown", so a countdown to it is counting down
 * to a fiction. Callers gate on the flag.
 *
 * ⚠ `d`/`h`/`m`/`s` are not routed through `copy.ts`. They are the same letters
 * in both languages the app ships; a copy key would only invite a translation
 * that breaks the fixed-width row.
 */
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Spacing } from '@/constants/theme';

const SECOND = 1_000;

interface Group {
  value: string;
  unit: string;
  /** The seconds group is accent — the one figure on the board that moves. */
  accent?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Days are dropped once there are none left, and hours once there are neither —
 * so the row shortens as kickoff approaches instead of showing `0d 00h 04m 12s`.
 */
function groups(msRemaining: number): Group[] {
  const total = Math.max(0, Math.floor(msRemaining / SECOND));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const seconds = total % 60;

  const out: Group[] = [];
  if (days > 0) out.push({ value: String(days), unit: 'd' });
  if (days > 0 || hours > 0) out.push({ value: pad(hours), unit: 'h' });
  out.push({ value: pad(minutes), unit: 'm' });
  out.push({ value: pad(seconds), unit: 's', accent: true });
  return out;
}

export function Countdown({ kickoffUtc }: { kickoffUtc: string }) {
  const target = Date.parse(kickoffUtc);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const stop = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    };

    const tick = () => {
      const at = Date.now();
      setNow(at);
      if (at >= target) return; // kicked off — nothing left to count
      timer = setTimeout(tick, SECOND - (at % SECOND));
    };

    tick();

    const sub = AppState.addEventListener('change', (state) => {
      stop();
      // Re-reads the clock rather than resuming the old cadence: the elapsed
      // background time is exactly what the suspended timer failed to count.
      if (state === 'active') tick();
    });

    return () => {
      stop();
      sub.remove();
    };
  }, [target]);

  return (
    <View style={styles.row}>
      {groups(target - now).map((group) => (
        <View key={group.unit} style={styles.group}>
          <Text
            variant="countdownNum"
            color={group.accent ? 'accent' : 'text'}
            tabular
            numberOfLines={1}>
            {group.value}
          </Text>
          <Text variant="countdownUnit" color="textFaint" numberOfLines={1}>
            {group.unit}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  group: { flexDirection: 'row', alignItems: 'baseline' },
});
