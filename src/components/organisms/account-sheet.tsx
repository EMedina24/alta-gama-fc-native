/**
 * The account sheet.
 *
 * Redesigned in ADR 0081 — an identity block with an avatar, tinted glyph tiles
 * on the alert rows, the lead times as chips, and the app's first staggered
 * entrance. **Nothing below the surface moved:** every rule in this header was
 * already true and still is.
 *
 * ⚠ The identity slot and the destructive action are BOTH conditional on
 * `account` (ADR 0038). This is the fill ADR 0019 designed the shape for, and it
 * stayed a fill: signed out, every row renders exactly as it did in the anonymous
 * v1, plus a Sign in button.
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
 * ⚠ **The goals switch is LIVE and its note is still load-bearing.** ADR 0053
 * put goals, red cards and full time behind this one switch and turned it on;
 * the note beside it now states the real limit (LaLiga only), not the old one
 * (no feed). A switch that promised a Bundesliga follower goal alerts would lie.
 *
 * ⚠ The `alertsNote` footnote sits directly under the alert group and must stay
 * there (ADR 0079). It is the only thing on screen that says whether the
 * settings above it ever reached the server, and its absence is exactly how
 * three dispatched goals reached zero devices for two days.
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
 * `bar` is the style that gets hoisted; `barRow` is the one that survives. The
 * rule that appears under it once scrolled is ABSOLUTELY positioned for the
 * same reason: out of flow, it cannot turn that row into a column.
 *
 * ⚠ `Close` is not decoration: the sheet is long, swipe-down is an invisible
 * affordance, and the bar also holds the identity heading clear of the grabber.
 *
 * ⚠ Every animation here branches on `useReducedMotion()`. No exceptions, and
 * nothing loops — `skeleton.tsx` is the app's only always-on animation.
 */
import * as Clipboard from 'expo-clipboard';
import { type ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';

import { Button, Crest, Hairline, Switch, Text } from '@/components/atoms';
import { AlertTile, SectionHeader, StatusBanner } from '@/components/molecules';
import { Colors, Motion, Radius, Size, Spacing } from '@/constants/theme';
import type { Copy } from '@/lib/i18n/copy';
import type { Locale } from '@/lib/i18n/phrases';
import { hapticArmed } from '@/lib/haptics';
import {
  REMINDER_LEAD_OPTIONS,
  type ClockFormat,
  type ReminderLead,
} from '@/store/preferences';

import { Identity } from './account-sheet/identity';
import { LeadChips } from './account-sheet/lead-chips';
import { Segmented } from './account-sheet/segmented';

export interface AccountFeed {
  slug: string;
  name: string;
  url: string;
  /** The club's `logoUrl`. `null` falls back to the monogram tile. */
  crest: string | null;
  /** The monogram behind a missing or broken crest. */
  abbr: string;
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
  /**
   * The line under the alert switches (ADR 0079): never registered, saved at
   * a time, or could not be saved. Resolved by the route, which holds the
   * reader's clock; this organism only prints it.
   */
  alertsNote: string;
  alerts: {
    reminder: boolean;
    moved: boolean;
    postponed: boolean;
    /** ⚠ Goals, reds and full time share ONE switch (ADR 0053). */
    goals: boolean;
    /** ⚠ Minutes before kickoff, subordinate to `reminder` (ADR 0040). Never
     *  empty while `reminder` is true — the store keeps the two coupled. */
    leads: readonly ReminderLead[];
  };
  feeds: readonly AccountFeed[];
  onSetAlert: (
    key: 'alertReminder' | 'alertMoved' | 'alertPostponed' | 'alertGoals',
    value: boolean,
  ) => void;
  onSetReminderLead: (lead: ReminderLead, value: boolean) => void;
  onSetLanguage: (lang: Locale) => void;
  onSetClock: (clock: ClockFormat) => void;
  onReplayOnboarding: () => void;
  onTurnOffAlerts: () => void;
  /** Opens the website's contact page in the system browser. */
  onContactUs: () => void;
  onClose: () => void;
  /** `null` when signed out — the identity slot and the footer both branch on it. */
  account: AccountIdentity | null;
  /**
   * The avatar's letters, resolved by the route. `null` is the signed-out
   * state and draws the mark (ADR 0081), not an empty disc.
   */
  initials: string | null;
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

/**
 * One block of the sheet, arriving on mount.
 *
 * ⚠ The stagger is what makes the sheet read as one thing assembling rather
 * than five things appearing. Keep it small: at more than ~50 ms a step, five
 * blocks read as a queue the reader is waiting through.
 */
function Rise({ step, children }: { step: number; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View
      entering={
        reduceMotion
          ? undefined
          : FadeInDown.duration(Motion.enter).delay(step * Motion.stagger)
      }>
      {children}
    </Animated.View>
  );
}

function Row({
  tile,
  title,
  note,
  children,
}: {
  /** The alert type's glyph tile. Preference rows have none. */
  tile?: ReactNode;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.row}>
      {tile}
      <View style={styles.rowText}>
        <Text variant="bodyStrong">{title}</Text>
        {note ? (
          <Text variant="footnote" color="textFaint">
            {note}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function AccountSheet({
  copy,
  locale,
  clock,
  zoneLabel,
  alertsNote,
  alerts,
  feeds,
  onSetAlert,
  onSetReminderLead,
  onSetLanguage,
  onSetClock,
  onReplayOnboarding,
  onTurnOffAlerts,
  onContactUs,
  onClose,
  account,
  initials,
  canSignIn,
  onSignIn,
  onSignOut,
  onDeleteAccount,
  deletingAccount,
  deleteAccountError,
}: AccountSheetProps) {
  const reduceMotion = useReducedMotion();
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  /** Whether the scroll has moved at all — the bar grows a rule when it has. */
  const [scrolled, setScrolled] = useState(false);
  /**
   * ⚠ Step one of the two-step delete. Local to the render on purpose: dismissing
   * the sheet disarms it, so a confirm cannot survive out of sight of the warning
   * that explains what it does.
   */
  const [armed, setArmed] = useState(false);
  const a = copy.account;

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      stickyHeaderIndices={[0]}
      scrollEventThrottle={16}
      onScroll={(event) => {
        const past = event.nativeEvent.contentOffset.y > 0;
        if (past !== scrolled) setScrolled(past);
      }}>
      <View style={styles.bar}>
        <View style={styles.barRow}>
          <Text variant="callout" color="textSecondary">
            {a.title}
          </Text>
          <Button label={copy.sheets.close} tone="quiet" full={false} onPress={onClose} />
        </View>
        {/* Absolutely positioned — see the header's second ⚠. */}
        {scrolled ? <View style={styles.barRule} /> : null}
      </View>

      <Rise step={0}>
        <View style={styles.identityBlock}>
          <Identity
            initials={initials}
            heading={account ? (account.name ?? account.email ?? a.someone) : a.notSignedIn}
            sub={
              account ? account.email : canSignIn ? a.signInBody : a.notSignedInBody
            }
            signedIn={account !== null}
          />

          {/* ⚠ Signed out and configurable only. Drawn here, directly under the
              identity it changes, rather than in the footer beside the
              destructive actions. It is the sheet's ONE primary — the accent
              budget is spent here while it is on screen (SPEC §2). */}
          {!account && canSignIn ? (
            <Button label={a.signIn} onPress={onSignIn} tall />
          ) : null}
        </View>
      </Rise>

      <Rise step={1}>
        <View style={styles.section}>
          <SectionHeader title={a.alertTypes} />
          <Animated.View
            style={styles.group}
            layout={reduceMotion ? undefined : LinearTransition.duration(Motion.base)}>
            <Row
              tile={<AlertTile kind="reminder" tone="neutral" />}
              title={a.reminder}
              note={a.reminderNote}>
              <Switch
                value={alerts.reminder}
                onValueChange={(v) => onSetAlert('alertReminder', v)}
                accessibilityLabel={a.reminder}
              />
            </Row>
            {/* ⚠ No `Hairline` above these — they read as part of the row they
                sit under, and a rule would cut them off from it. While the
                master is off they are not drawn at all (ADR 0081). */}
            {alerts.reminder ? (
              <LeadChips
                options={REMINDER_LEAD_OPTIONS}
                selected={alerts.leads}
                labels={a.leadsShort}
                longLabels={a.leads}
                onToggle={onSetReminderLead}
              />
            ) : null}
            <Hairline />
            <Row
              tile={<AlertTile kind="moved" tone="moved" />}
              title={a.moved}
              note={a.movedNote}>
              <Switch
                value={alerts.moved}
                onValueChange={(v) => onSetAlert('alertMoved', v)}
                accessibilityLabel={a.moved}
              />
            </Row>
            <Hairline />
            <Row
              tile={<AlertTile kind="postponed" tone="postponed" />}
              title={a.postponed}
              note={a.postponedNote}>
              <Switch
                value={alerts.postponed}
                onValueChange={(v) => onSetAlert('alertPostponed', v)}
                accessibilityLabel={a.postponed}
              />
            </Row>
            <Hairline />
            <Row
              tile={<AlertTile kind="goals" tone="neutral" />}
              title={a.goals}
              note={a.goalsNote}>
              <Switch
                value={alerts.goals}
                onValueChange={(v) => onSetAlert('alertGoals', v)}
                accessibilityLabel={a.goals}
              />
            </Row>
          </Animated.View>

          {/* ⚠ ADR 0079. Stays directly under the switches — see the header. */}
          <Text variant="footnote" color="textFaint">
            {alertsNote}
          </Text>
        </View>
      </Rise>

      <Rise step={2}>
        <View style={styles.section}>
          <SectionHeader title={a.preferences} />
          <View style={styles.group}>
            <Row title={a.language}>
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
            <Row title={a.clock}>
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
            <Row title={a.timezone}>
              <Text variant="body" color="textDim">
                {zoneLabel}
              </Text>
            </Row>
          </View>
        </View>
      </Rise>

      <Rise step={3}>
        <View style={styles.section}>
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
                    {/* The crest the design always specified for these rows and
                        that was never drawn (SPEC §3.6). */}
                    <Crest src={feed.crest} fallback={feed.abbr} size={Size.crestList} />
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
        </View>
      </Rise>

      <Rise step={4}>
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
                    // The one tap on this sheet that commits to something the
                    // server cannot undo. It should not feel like the others.
                    void hapticArmed();
                    setArmed(true);
                    return;
                  }
                  onDeleteAccount();
                }}
              />
              {/* ⚠ A red panel can never read as "saved" (ADR 0074) — and this
                  one says the account is STILL ALIVE, which a quiet red line
                  under two buttons did not. */}
              {deleteAccountError ? (
                <StatusBanner kind="error" text={deleteAccountError} />
              ) : null}
              {/* ⚠ The note is drawn only once armed, and it is what makes the
                  second press informed consent rather than a double tap. */}
              {armed ? (
                <Animated.View
                  entering={reduceMotion ? undefined : FadeInDown.duration(Motion.base)}>
                  <Text variant="footnote" color="textFaint">
                    {a.deleteAccountNote}
                  </Text>
                </Animated.View>
              ) : null}
            </>
          ) : null}

          {/* A small link, not a Button: it is a way out to the website, not an
              action on the account, and it must not compete with the buttons above. */}
          <Text
            variant="footnote"
            color="textDim"
            accessibilityRole="link"
            onPress={onContactUs}
            style={styles.contact}
          >
            {a.contactUs}
          </Text>
        </View>
      </Rise>
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
  barRule: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.dark.hairlineMid,
  },
  wrap: { paddingHorizontal: Spacing.five, paddingBottom: Spacing.eight, gap: Spacing.three },
  identityBlock: { gap: Spacing.three, marginBottom: Spacing.one },
  section: { gap: Spacing.three },
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
  footer: { gap: Spacing.two, marginTop: Spacing.four },
  contact: { alignSelf: 'flex-start', marginTop: Spacing.two },
});
