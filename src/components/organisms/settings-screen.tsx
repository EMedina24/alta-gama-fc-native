/**
 * Settings (ADR 0208) — the account sheet, re-made as a pushed screen after
 * Ed's Medina mock: a profile header, then FAVOURITE CLUB, FOLLOWING,
 * NOTIFICATIONS, APPEARANCE, CALENDAR and ABOUT as glass groups over the
 * reader's chosen background, then the account card and the footer.
 *
 * Presentational (ADR 0013): the route reads every store and query and hands
 * this plain values and callbacks, exactly as it did for the sheet.
 *
 * ⚠ **What the mock drew and this does NOT, deliberately** — each needs work
 * that does not exist yet, and a control with nothing behind it is a lie:
 * "Member since" and followed LEAGUES (backend), separate Full-time and Live
 * Activities switches (backend), and Hide scores (a cross-app feature).
 * FOLLOWING lists CLUBS, the only thing a reader can follow.
 *
 * ⚠ **What the mock did not draw and this KEEPS**, restyled: kickoff-moved and
 * postponed alerts, the 24 h / 12 h clock, the calendar feeds, replay
 * onboarding, turn off alerts, and Delete account (Guideline 5.1.1(v)).
 *
 * ⚠ No entrance animation. The old sheet staggered its blocks in with an
 * opacity fade — on the parents of what are now GLASS groups, and an alpha on a
 * glass ancestor kills the glass (0120/0122; trap 80).
 *
 * ⚠ The lime budget: the switches (a system control, 0081/0093) and, signed
 * out, the Sign in button. The segmented controls are the NEUTRAL tone and
 * Edit profile is glass, so nothing else competes.
 */
import * as Clipboard from 'expo-clipboard';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Crest, Eyebrow, Text } from '@/components/atoms';
import {
  FollowChips,
  ListGroup,
  ScreenBar,
  SceneTileStrip,
  Segmented,
  SettingsRow,
  type FollowChip,
  type SceneTileStripItem,
} from '@/components/molecules';
import { Size, Spacing } from '@/constants/theme';
import type { Copy } from '@/lib/i18n/copy';
import type { Locale } from '@/lib/i18n/phrases';
import type { ClockFormat, ReminderLead } from '@/store/preferences';

import { AccountActions } from './settings/account-actions';
import { NotificationsSection, type AlertKey } from './settings/notifications-section';
import { ProfileHeader } from './settings/profile-header';

export interface SettingsFeed {
  slug: string;
  name: string;
  url: string;
  /** The club's crest. `null` falls back to the monogram. */
  crest: string | null;
  abbr: string;
}

/** The signed-in identity. `null` renders the signed-out header. */
export interface SettingsIdentity {
  /** ⚠ May be null — Apple gives a name only on the first authorization ever. */
  name: string | null;
  /** ⚠ From `GET /cronogol/me`, never the JWT (stale for up to an hour after a
   *  confirmed change). May be an `@privaterelay.appleid.com` address. */
  email: string | null;
}

export interface SettingsFavourite {
  name: string;
  /** "LaLiga · 1.º · 21 pts" — `null` when no quotable table holds the club. */
  line: string | null;
  crest: string | null;
  abbr: string;
}

export interface SettingsScreenProps {
  copy: Copy;
  locale: Locale;
  clock: ClockFormat;
  onBack: () => void;

  /** `null` when signed out — the header and the account card branch on it. */
  account: SettingsIdentity | null;
  /** The avatar's letters; `null` signed out (the silhouette). */
  initials: string | null;
  canSignIn: boolean;
  onSignIn: () => void;
  onEditProfile: () => void;

  favourite: SettingsFavourite | null;
  onChooseFavourite: () => void;

  follows: readonly FollowChip[];
  onAddFollow: () => void;

  alerts: {
    reminder: boolean;
    moved: boolean;
    postponed: boolean;
    goals: boolean;
    leads: readonly ReminderLead[];
  };
  onSetAlert: (key: AlertKey, value: boolean) => void;
  onSetReminderLead: (lead: ReminderLead, value: boolean) => void;
  alertsNote: string;
  onAlertsNotePress?: () => void;
  onTurnOffAlerts: () => void;

  /** Already built with their marks — `backgroundTiles` (a template). */
  backgroundTiles: readonly SceneTileStripItem[];
  onSetLanguage: (lang: Locale) => void;
  onSetClock: (clock: ClockFormat) => void;
  /** "Your time · EDT", or a picked zone's label. */
  zoneValue: string;
  onChooseZone: () => void;

  feeds: readonly SettingsFeed[];

  onPrivacy: () => void;
  onHelp: () => void;
  onReplayOnboarding: () => void;
  /** "2.4.0 (318)" — `null` where the platform does not say. */
  version: string | null;

  onSignOut: () => void;
  onDeleteAccount: () => void;
  deletingAccount: boolean;
  deleteAccountError: string | null;
}

/** An eyebrow over its group — the iOS inset-grouped section. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {/* `textDim`, a step up from the eyebrow's default: these sit over a
          club's scene, where `textFaint` sinks into the colour. */}
      <Eyebrow accessibilityRole="header" color="textDim" style={styles.eyebrow}>
        {title}
      </Eyebrow>
      {children}
    </View>
  );
}

export function SettingsScreen(props: SettingsScreenProps) {
  const { copy, locale, clock, account, favourite, feeds } = props;
  const a = copy.account;
  const s = copy.settings;
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  return (
    <View style={styles.stack}>
      <ScreenBar title={s.title} onBack={props.onBack} backLabel={s.back} />

      <ProfileHeader
        initials={props.initials}
        signedIn={account !== null}
        heading={account ? (account.name ?? a.someone) : a.notSignedIn}
        sub={account ? account.email : props.canSignIn ? a.signInBody : a.notSignedInBody}
        badge={favourite ? { crest: favourite.crest, abbr: favourite.abbr } : null}
        editLabel={s.editProfile}
        onEdit={props.onEditProfile}
        signIn={!account && props.canSignIn ? { label: a.signIn, onPress: props.onSignIn } : null}
      />

      <Section title={s.favouriteClub}>
        <ListGroup>
          {favourite ? (
            <SettingsRow
              title={favourite.name}
              note={favourite.line}
              trailing={<Crest src={favourite.crest} fallback={favourite.abbr} size={Size.crestList} />}
              onPress={props.onChooseFavourite}
            />
          ) : (
            <SettingsRow
              title={s.chooseFavourite}
              note={s.chooseFavouriteNote}
              onPress={props.onChooseFavourite}
            />
          )}
        </ListGroup>
      </Section>

      <Section title={s.following}>
        <ListGroup>
          <FollowChips chips={props.follows} addLabel={s.add} onAdd={props.onAddFollow} />
        </ListGroup>
      </Section>

      <Section title={s.notifications}>
        <NotificationsSection
          copy={a}
          alerts={props.alerts}
          onSetAlert={props.onSetAlert}
          onSetReminderLead={props.onSetReminderLead}
          alertsNote={props.alertsNote}
          onAlertsNotePress={props.onAlertsNotePress}
          onTurnOffAlerts={props.onTurnOffAlerts}
        />
      </Section>

      <Section title={s.appearance}>
        <ListGroup>
          <View style={styles.background}>
            <Text variant="body" style={styles.backgroundTitle}>
              {s.background}
            </Text>
            <SceneTileStrip tiles={props.backgroundTiles} />
          </View>
          <SettingsRow
            title={a.language}
            trailing={
              <Segmented
                tone="neutral"
                accessibilityLabel={a.language}
                options={[
                  { key: 'en' as Locale, label: 'EN' },
                  { key: 'es' as Locale, label: 'ES' },
                ]}
                value={locale}
                onChange={props.onSetLanguage}
              />
            }
          />
          <SettingsRow
            title={a.clock}
            trailing={
              <Segmented
                tone="neutral"
                accessibilityLabel={a.clock}
                options={[
                  { key: '24' as ClockFormat, label: '24 h' },
                  { key: '12' as ClockFormat, label: '12 h' },
                ]}
                value={clock}
                onChange={props.onSetClock}
              />
            }
          />
          <SettingsRow
            title={a.timezone}
            trailing={
              <Text variant="body" color="textDim" numberOfLines={1} style={styles.value}>
                {props.zoneValue}
              </Text>
            }
            onPress={props.onChooseZone}
          />
        </ListGroup>
      </Section>

      <Section title={a.feeds}>
        {feeds.length === 0 ? (
          <Text variant="footnote" color="textDim" style={styles.note}>
            {a.noFeeds}
          </Text>
        ) : (
          <ListGroup>
            {feeds.map((feed) => (
              <SettingsRow
                key={feed.slug}
                leading={<Crest src={feed.crest} fallback={feed.abbr} size={Size.crestList} />}
                title={feed.name}
                // The URL with its scheme dropped — the part a reader can check.
                note={feed.url.replace(/^https?:\/\//, '')}
                trailing={
                  <Text
                    variant="eyebrowSm"
                    // Lime only once it has DONE something — the confirmation,
                    // not the offer, is worth the accent on a screen of switches.
                    color={copiedSlug === feed.slug ? 'accent' : 'textSecondary'}
                    accessibilityRole="button"
                    onPress={async () => {
                      await Clipboard.setStringAsync(feed.url);
                      setCopiedSlug(feed.slug);
                    }}>
                    {copiedSlug === feed.slug ? copy.sheets.copied : copy.sheets.copyAction}
                  </Text>
                }
              />
            ))}
          </ListGroup>
        )}
      </Section>

      <Section title={s.about}>
        <ListGroup>
          <SettingsRow title={s.privacy} onPress={props.onPrivacy} />
          <SettingsRow title={s.help} onPress={props.onHelp} />
          <SettingsRow title={a.replayOnboarding} onPress={props.onReplayOnboarding} />
          {props.version ? (
            <SettingsRow
              title={s.version}
              trailing={
                <Text variant="body" color="textDim" tabular>
                  {props.version}
                </Text>
              }
            />
          ) : null}
        </ListGroup>
      </Section>

      {account ? (
        <AccountActions
          copy={a}
          onSignOut={props.onSignOut}
          onDeleteAccount={props.onDeleteAccount}
          deleting={props.deletingAccount}
          deleteError={props.deleteAccountError}
        />
      ) : null}

      <Text variant="footnote" color="textFaint" center style={styles.footer}>
        {s.footer}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.five },
  section: { gap: Spacing.two },
  // The eyebrow sits on the rows' text inset, the iOS grouped-list header.
  eyebrow: { paddingHorizontal: Spacing.four },
  note: { paddingHorizontal: Spacing.four },
  background: { paddingVertical: Spacing.three, gap: Spacing.three },
  backgroundTitle: { paddingHorizontal: Spacing.four },
  // ⚠ Shrinks before the row's title does: "Madrid · Berlin (CEST)" is long.
  value: { flexShrink: 1, textAlign: 'right' },
  footer: { marginTop: Spacing.two },
});
