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
import { Colors, Radius, Spacing } from '@/constants/theme';
import { googleAddUrl, webcalUrl } from '@/lib/cronogol/feed';

export interface CalendarSheetProps {
  title: string;
  body: string;
  /** The `https://…​.ics` feed URL. */
  feedUrl: string;
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

export function CalendarSheet({ title, body, feedUrl, copy }: CalendarSheetProps) {
  const [copied, setCopied] = useState(false);
  const webcal = webcalUrl(feedUrl);

  return (
    <View style={styles.wrap}>
      <Text variant="title3">{title}</Text>
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
