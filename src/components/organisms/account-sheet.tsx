/**
 * The account sheet.
 *
 * ⚠ The identity slot and the destructive action are BOTH conditional on
 * `account` (ADR 0038). This is the fill ADR 0019 designed the shape for, and it
 * stayed a fill: signed out, every row renders exactly as it did in the anonymous
 * v1, plus a Sign in row.
 *
 * ⚠ **Signed out, the destructive action is still "turn off alerts on this
 * device" — not a disabled "Delete account".** There is no account to delete, and
 * turning off alerts remains the only destructive thing a signed-out reader can do.
 *
 * ⚠ Apple's Guideline 5.1.1(v) binds the moment account CREATION ships, which is
 * now. Signed in, "Delete account" must be reachable in-app and must really
 * delete — it is a two-step confirm because the server has no undo.
 *
 * ⚠ The design's `VERIFIED` pill is deliberately NOT drawn. Nothing in
 * `GET /cronogol/me` reports verification, and a pill asserting it from a
 * provider guess is worse than no pill.
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
import {
  REMINDER_LEAD_OPTIONS,
  type ClockFormat,
  type ReminderLead,
} from '@/store/preferences';

export interface AccountFeed {
  slug: string;
  name: string;
  url: string;
}

/** The signed-in identity. `null` renders the signed-out slot. */
export interface AccountIdentity {
  /** ⚠ May be null — Apple gives a name only on the first authorization ever. */
  name: string | null;
  /** ⚠ From `GET /cronogol/me`, never from the JWT: the token's copy goes stale
   *  for up to an hour after a confirmed email change. May be a
   *  `@privaterelay.appleid.com` address for a Hide-My-Email signup. */
  email: string | null;
}

export interface AccountSheetProps {
  copy: Copy;
  locale: Locale;
  clock: ClockFormat;
  zoneLabel: string;
  alerts: {
    reminder: boolean;
    moved: boolean;
    postponed: boolean;
    /** ⚠ Minutes before kickoff, subordinate to `reminder` (ADR 0040). Never
     *  empty while `reminder` is true — the store keeps the two coupled. */
    leads: readonly ReminderLead[];
  };
  feeds: readonly AccountFeed[];
  onSetAlert: (key: 'alertReminder' | 'alertMoved' | 'alertPostponed', value: boolean) => void;
  onSetReminderLead: (lead: ReminderLead, value: boolean) => void;
  onSetLanguage: (lang: Locale) => void;
  onSetClock: (clock: ClockFormat) => void;
  onReplayOnboarding: () => void;
  onTurnOffAlerts: () => void;
  onClose: () => void;
  /** `null` when signed out — the identity slot and the footer both branch on it. */
  account: AccountIdentity | null;
  /** Whether sign-in can be offered at all (env vars present). */
  canSignIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  /** ⚠ Fires only on the SECOND press. The first arms the confirm. */
  onDeleteAccount: () => void;
  deletingAccount: boolean;
  /**
   * ⚠ Localised already. Non-null means the account is **still alive** — the
   * reader stays signed in and the sheet stays open, because signing them out on
   * a failed delete would tell them it worked.
   */
  deleteAccountError: string | null;
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

/**
 * One lead time, nested under the reminder master.
 *
 * ⚠ Indented and drawn at `callout` rather than `bodyStrong` — the indent is the
 * only thing saying "this belongs to the row above", since the group has no
 * nesting affordance of its own.
 *
 * ⚠ `disabled` is real, not cosmetic. While the master is off these deliver
 * nothing, and a live switch that changes nothing visible is the same lie the
 * disabled goals row exists to avoid.
 */
function LeadRow({
  title,
  value,
  disabled,
  onValueChange,
}: {
  title: string;
  value: boolean;
  disabled: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={[styles.row, styles.leadRow]}>
      <Text
        variant="callout"
        color={disabled ? 'textFaint' : 'textSecondary'}
        style={styles.rowText}
      >
        {title}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={title}
      />
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
  onSetReminderLead,
  onSetLanguage,
  onSetClock,
  onReplayOnboarding,
  onTurnOffAlerts,
  onClose,
  account,
  canSignIn,
  onSignIn,
  onSignOut,
  onDeleteAccount,
  deletingAccount,
  deleteAccountError,
}: AccountSheetProps) {
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  /**
   * ⚠ Step one of the two-step delete. Local to the render on purpose: dismissing
   * the sheet disarms it, so a confirm cannot survive out of sight of the warning
   * that explains what it does.
   */
  const [armed, setArmed] = useState(false);
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
        {account ? (
          <>
            {/* ⚠ Name falls back to the email, then to a neutral label — an Apple
                account whose one naming chance was missed has neither, and an
                empty heading reads as a broken sheet. */}
            <Text variant="title3">{account.name ?? account.email ?? a.someone}</Text>
            {account.email ? (
              <Text variant="footnote" color="textDim">
                {account.email}
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <Text variant="title3">{a.notSignedIn}</Text>
            <Text variant="footnote" color="textDim">
              {canSignIn ? a.signInBody : a.notSignedInBody}
            </Text>
          </>
        )}
      </View>

      {/* ⚠ Signed out and configurable only. Drawn here, directly under the
          identity it changes, rather than in the footer beside the destructive
          actions. */}
      {!account && canSignIn ? (
        <Button label={a.signIn} tone="outline" onPress={onSignIn} />
      ) : null}

      <SectionHeader title={a.alertTypes} />
      <View style={styles.group}>
        <Row title={a.reminder} note={a.reminderNote}>
          <Switch
            value={alerts.reminder}
            onValueChange={(v) => onSetAlert('alertReminder', v)}
            accessibilityLabel={a.reminder}
          />
        </Row>
        {/* ⚠ No `Hairline` above these — they read as part of the row they sit
            under, and a rule would cut them off from it. The next one is below
            the last lead, where the nesting actually ends. */}
        {REMINDER_LEAD_OPTIONS.map((lead) => (
          <LeadRow
            key={lead}
            title={a.leads[lead]}
            value={alerts.leads.includes(lead)}
            disabled={!alerts.reminder}
            onValueChange={(v) => onSetReminderLead(lead, v)}
          />
        ))}
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

        {/* ⚠ Stays for a signed-in reader too. Alerts are DEVICE state: they
            survive both signing out and deleting the account, so this is the only
            control that stops them and it must not disappear behind an identity. */}
        <Button label={a.turnOffAlerts} tone="danger" onPress={onTurnOffAlerts} />
        <Text variant="footnote" color="textFaint">
          {a.turnOffAlertsNote}
        </Text>

        {account ? (
          <>
            <Button label={a.signOut} tone="quiet" onPress={onSignOut} />
            <Button
              label={armed ? a.deleteAccountConfirm : a.deleteAccount}
              tone="danger"
              loading={deletingAccount}
              onPress={() => {
                if (!armed) {
                  setArmed(true);
                  return;
                }
                onDeleteAccount();
              }}
            />
            {deleteAccountError ? (
              <Text variant="footnote" color="danger">
                {deleteAccountError}
              </Text>
            ) : null}
            {/* ⚠ The note is drawn only once armed, and it is what makes the
                second press informed consent rather than a double tap. */}
            {armed ? (
              <Text variant="footnote" color="textFaint">
                {a.deleteAccountNote}
              </Text>
            ) : null}
          </>
        ) : null}
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
  // The indent is the nesting cue; the shorter row keeps three of them from
  // outweighing the master above.
  leadRow: { paddingLeft: Spacing.seven, paddingVertical: Spacing.two, minHeight: 44 },
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
