/**
 * "Add matches to…" — Google, Apple, an `.ics` snapshot, and the feed URL.
 *
 * ⚠ **No calendar permission and no `expo-calendar`.** All four actions are
 * `Linking.openURL` plus one clipboard write. Reaching for the calendar API would
 * add a scary permission prompt for zero benefit — and worse, it tempts someone
 * into WRITING events locally, which destroys the product: a locally-written
 * event never moves when a kickoff does, and "your calendar entry has already
 * been updated" becomes a lie.
 *
 * ⚠ **The Google `cid` must carry the `webcal://` URL, not the `https://` one.**
 * Handed an `https://` cid, Google opens, adds nothing, and reports no error — so
 * it looks like it worked. That bug shipped twice on the web app.
 *
 * ⚠ The only host that may appear on screen is the public feed URL. No env var
 * names, no config keys, no deployment state — anywhere a visitor can see.
 */
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/atoms';
import { SegmentedControl } from '@/components/molecules';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { googleAddUrl, webcalUrl } from '@/lib/cronogol/feed';

export interface CalendarSheetProps {
  title: string;
  body: string;
  /** The `https://…​.ics` feed URL. */
  feedUrl: string;
  /**
   * An optional choice of WHAT to subscribe to, drawn above the body (ADR 0157).
   *
   * ⚠ Only the Champions League passes one, because it is the only competition
   * with two feeds that are not interchangeable: a knockout tie carries no
   * matchday, so the round feed cannot reach one and the season feed is the only
   * path to them. A club or a domestic matchday has exactly one feed and passes
   * nothing, which leaves this sheet byte-identical to before.
   *
   * ⚠ The control is `tone="quiet"`, never `accent`: this sheet already spends
   * its one lime hero on the Google button (SPEC §2, ADR 0147).
   */
  scope?: {
    options: readonly { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    accessibilityLabel: string;
  };
  copy: {
    google: string;
    apple: string;
    download: string;
    copied: string;
    copyAction: string;
    /** States that a snapshot never updates again. */
    snapshotNote: string;
  };
}

export function CalendarSheet({ title, body, feedUrl, scope, copy }: CalendarSheetProps) {
  const [copied, setCopied] = useState(false);
  const webcal = webcalUrl(feedUrl);

  return (
    <View style={styles.wrap}>
      <Text variant="title3">{title}</Text>

      {/* ⚠ ABOVE the body, because the body describes whatever is selected —
          a reader has to see what they are reading about before they read it. */}
      {scope ? (
        <SegmentedControl
          options={scope.options}
          value={scope.value}
          onChange={scope.onChange}
          tone="quiet"
          accessibilityLabel={scope.accessibilityLabel}
        />
      ) : null}

      <Text variant="body" color="textDim">
        {body}
      </Text>

      <View style={styles.actions}>
        <Button label={copy.google} onPress={() => void Linking.openURL(googleAddUrl(webcal))} />
        <Button
          label={copy.apple}
          tone="secondary"
          onPress={() => void Linking.openURL(webcal)}
        />
        <Button
          label={copy.download}
          tone="quiet"
          onPress={() => void Linking.openURL(feedUrl)}
        />
      </View>

      <Text variant="footnote" color="textFaint">
        {copy.snapshotNote}
      </Text>

      <View style={styles.urlBox}>
        <Text variant="micro" color="textDim" numberOfLines={2} style={styles.url}>
          {webcal}
        </Text>
        <Button
          label={copied ? copy.copied : copy.copyAction}
          tone="quiet"
          full={false}
          onPress={async () => {
            await Clipboard.setStringAsync(webcal);
            setCopied(true);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three, padding: Spacing.five },
  actions: { gap: Spacing.two, marginTop: Spacing.two },
  urlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.dark.glassFill,
    borderRadius: Radius.control,
    paddingLeft: Spacing.three,
    paddingVertical: Spacing.two,
  },
  // Monospace: the design renders the feed URL as a literal you can read back.
  url: { flex: 1, fontFamily: 'Menlo' },
});
