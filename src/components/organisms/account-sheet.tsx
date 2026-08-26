/**
 * The account sheet.
 *
 * ⚠ Anonymous v1 (ADR 0019): there is no identity, no sign-out and no
 * "Delete account". The shape is the designed one so auth drops in as a fill —
 * identity slot, alert types, preferences, feeds, destructive action — but the
 * identity slot says what is true, and the destructive action is "turn off alerts
 * on this device".
 *
 * ⚠ Apple's Guideline 5.1.1(v) deletion requirement binds only on apps that
 * support account CREATION. Shipping a "Delete account" button that deletes
 * nothing would be worse than shipping none.
 *
 * ⚠ **The goals switch is drawn disabled WITH its reason and the reason stays.**
 * That type does not exist and is not coming without a live feed.
 *
 * ⚠ The `Cuenta · Cerrar` bar is a STICKY first child of the scroll, not a
 * sibling above it. Inside a `formSheet`, react-native-screens lays the screen
 * out with an auto height (its own comment: "due to how Yoga resolves layout"),
 * so a `flex: 1` wrapper collapses to zero and paints its children on top of
 * each other. `stickyHeaderIndices` pins the bar without needing a height.
 *
 * ⚠ …and that is why the bar is TWO views deep. React Native moves a sticky
 * child's style onto the wrapper it generates and replaces the child's own with
 * `{ flex: 1 }` — so a row laid out at that level silently becomes a column.
 * `bar` is the style that gets hoisted; `barRow` is the one that survives.
 *
 * ⚠ `Close` is not decoration: the sheet is long, swipe-down is an invisible
 * affordance, and the bar also holds the identity heading clear of the grabber.
 */
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Hairline, Switch, Text } from '@/components/atoms';
import { SectionHeader } from '@/components/molecules';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Copy } from '@/lib/i18n/copy';
import type { Locale } from '@/lib/i18n/phrases';
import type { ClockFormat } from '@/store/preferences';

export interface AccountFeed {
  slug: string;
  name: string;
  url: string;
}

export interface AccountSheetProps {
  copy: Copy;
  locale: Locale;
  clock: ClockFormat;
  zoneLabel: string;
  alerts: { reminder: boolean; moved: boolean; postponed: boolean };
  feeds: readonly AccountFeed[];
  onSetAlert: (key: 'alertReminder' | 'alertMoved' | 'alertPostponed', value: boolean) => void;
  onSetLanguage: (lang: Locale) => void;
  onSetClock: (clock: ClockFormat) => void;
  onReplayOnboarding: () => void;
  onTurnOffAlerts: () => void;
  onClose: () => void;
}

function Row({
  title,
  note,
  children,
  dim = false,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
  dim?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text variant="bodyStrong" color={dim ? 'textDim' : 'text'}>
          {title}
        </Text>
        <Text variant="footnote" color="textFaint">
          {note}
        </Text>
      </View>
      {children}
    </View>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => (
        <Text
          key={option.key}
          variant="callout"
          color={option.key === value ? 'onAccent' : 'textSecondary'}
          onPress={() => onChange(option.key)}
          style={[styles.segment, option.key === value && styles.segmentActive]}>
          {option.label}
        </Text>
      ))}
    </View>
  );
}

export function AccountSheet({
  copy,
  locale,
  clock,
  zoneLabel,
  alerts,
  feeds,
  onSetAlert,
  onSetLanguage,
  onSetClock,
  onReplayOnboarding,
  onTurnOffAlerts,
  onClose,
}: AccountSheetProps) {
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const a = copy.account;

  return (
    <ScrollView contentContainerStyle={styles.wrap} stickyHeaderIndices={[0]}>
      <View style={styles.bar}>
        <View style={styles.barRow}>
          <Text variant="callout" color="textSecondary">
            {a.title}
          </Text>
          <Button label={copy.sheets.close} tone="quiet" full={false} onPress={onClose} />
        </View>
      </View>

      <View style={styles.identity}>
        <Text variant="title3">{a.notSignedIn}</Text>
        <Text variant="footnote" color="textDim">
          {a.notSignedInBody}
        </Text>
      </View>

      <SectionHeader title={a.alertTypes} />
      <View style={styles.group}>
        <Row title={a.reminder} note={a.reminderNote}>
          <Switch
            value={alerts.reminder}
            onValueChange={(v) => onSetAlert('alertReminder', v)}
            accessibilityLabel={a.reminder}
          />
        </Row>
        <Hairline />
        <Row title={a.moved} note={a.movedNote}>
          <Switch
            value={alerts.moved}
            onValueChange={(v) => onSetAlert('alertMoved', v)}
            accessibilityLabel={a.moved}
          />
        </Row>
        <Hairline />
        <Row title={a.postponed} note={a.postponedNote}>
          <Switch
            value={alerts.postponed}
            onValueChange={(v) => onSetAlert('alertPostponed', v)}
            accessibilityLabel={a.postponed}
          />
        </Row>
        <Hairline />
        {/* ⚠ Disabled, and the reason beside it is load-bearing. */}
        <Row title={a.goals} note={a.goalsNote} dim>
          <Switch value={false} onValueChange={() => {}} disabled accessibilityLabel={a.goals} />
        </Row>
      </View>

      <Text variant="footnote" color="textFaint">
        {copy.sheets.alertsPendingNote}
      </Text>

      <SectionHeader title={a.preferences} />
      <View style={styles.group}>
        <Row title={a.language} note="">
          <Segmented
            options={[
              { key: 'en' as Locale, label: 'EN' },
              { key: 'es' as Locale, label: 'ES' },
            ]}
            value={locale}
            onChange={onSetLanguage}
          />
        </Row>
        <Hairline />
        <Row title={a.clock} note="">
          <Segmented
            options={[
              { key: '24' as ClockFormat, label: '24 h' },
              { key: '12' as ClockFormat, label: '12 h' },
            ]}
            value={clock}
            onChange={onSetClock}
          />
        </Row>
        <Hairline />
        <Row title={a.timezone} note="">
          <Text variant="body" color="textDim">
            {zoneLabel}
          </Text>
        </Row>
      </View>

      <SectionHeader title={a.feeds} meta={feeds.length ? String(feeds.length) : null} />
      {feeds.length === 0 ? (
        <Text variant="body" color="textDim">
          {a.noFeeds}
        </Text>
      ) : (
        <View style={styles.group}>
          {feeds.map((feed, index) => (
            <View key={feed.slug}>
              {index > 0 ? <Hairline /> : null}
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {feed.name}
                  </Text>
                  <Text variant="micro" color="textFaint" numberOfLines={1} style={styles.url}>
                    {feed.url.replace(/^https?:\/\//, '')}
                  </Text>
                </View>
                <Text
                  variant="eyebrowSm"
                  color="accent"
                  onPress={async () => {
                    await Clipboard.setStringAsync(feed.url);
                    setCopiedSlug(feed.slug);
                  }}>
                  {copiedSlug === feed.slug ? copy.sheets.copied : copy.sheets.copyAction}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Button label={a.replayOnboarding} tone="quiet" onPress={onReplayOnboarding} />
        <Button label={a.turnOffAlerts} tone="danger" onPress={onTurnOffAlerts} />
        <Text variant="footnote" color="textFaint">
          {a.turnOffAlertsNote}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Full-bleed out of the 20pt gutter, so no content shows past the bar while
  // it is pinned.
  bar: { marginHorizontal: -Spacing.five, backgroundColor: Colors.dark.card },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Clears the sheet grabber. ⚠ The right gutter is the Button's own padding —
    // `Spacing.one` here lands its label on the same gutter as the content below.
    paddingLeft: Spacing.five,
    paddingRight: Spacing.one,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.one,
  },
  wrap: { paddingHorizontal: Spacing.five, paddingBottom: Spacing.eight, gap: Spacing.three },
  identity: { gap: Spacing.one, marginBottom: Spacing.two },
  group: { backgroundColor: Colors.dark.raised, borderRadius: Radius.group, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    minHeight: 56,
  },
  rowText: { flex: 1, gap: Spacing.half, minWidth: 0 },
  url: { fontFamily: 'Menlo' },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.raisedAlt,
    borderRadius: Radius.seg,
    padding: 2,
  },
  segment: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.chipSm,
    overflow: 'hidden',
  },
  segmentActive: { backgroundColor: Colors.dark.accent },
  footer: { gap: Spacing.two, marginTop: Spacing.four },
});
