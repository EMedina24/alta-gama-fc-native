/**
 * Settings' profile header (ADR 0208): a centred stack — the avatar with the
 * favourite club's crest as a badge, the name in Saira, the email, and Edit
 * profile as a glass pill. Signed out, the same stack invites a sign-in.
 *
 * ⚠ The heading is `name ?? someone`, NOT `name ?? email`. Saira is uppercase
 * by token, and an email address set in 40pt condensed capitals reads as a
 * shout, not a name. The email is always the line under it anyway.
 *
 * ⚠ No "Member since". Ed's mock drew it, and `profiles.created_at` exists,
 * but `GET /cronogol/me` does not return it — that is a `senpai-backend`
 * change, left undone rather than faked (ADR 0208).
 *
 * ⚠ No `VERIFIED` pill, still (ADR 0038): nothing on the wire reports it.
 *
 * ⚠ Signed out, the Sign in button is this screen's one PRIMARY — the lime
 * budget is spent here while it is on screen (SPEC §2). Signed in, nothing in
 * the header is lime: the avatar drops the accent ring the old sheet drew.
 */
import { StyleSheet, View } from 'react-native';

import { Avatar, Button, Crest, PencilGlyph, Text } from '@/components/atoms';
import { Colors, Size, Spacing } from '@/constants/theme';

export interface ProfileHeaderProps {
  /** `null` while signed out — the avatar falls back to the silhouette. */
  initials: string | null;
  signedIn: boolean;
  heading: string;
  /** The email signed in, the invitation signed out. `null` draws nothing. */
  sub: string | null;
  /** The favourite club's crest for the avatar's badge (ADR 0209). */
  badge: { crest: string | null; abbr: string } | null;
  editLabel: string;
  onEdit: () => void;
  /** Present only when signing in can be offered (signed out, env present). */
  signIn: { label: string; onPress: () => void } | null;
}

export function ProfileHeader({
  initials,
  signedIn,
  heading,
  sub,
  badge,
  editLabel,
  onEdit,
  signIn,
}: ProfileHeaderProps) {
  return (
    <View style={styles.stack}>
      <Avatar
        initials={initials}
        size={Size.avatarXl}
        // ⚠ ONLY while signed out (ADR 0101): the arc is the invitation.
        attention={!signedIn}
        badge={
          badge ? (
            <View style={styles.badge}>
              <Crest src={badge.crest} fallback={badge.abbr} size={Size.avatarBadge - Spacing.three} />
            </View>
          ) : undefined
        }
      />

      <View style={styles.text}>
        <Text
          variant="heroTitle"
          center
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          accessibilityRole="header">
          {heading}
        </Text>
        {sub ? (
          <Text variant="footnote" color="textDim" center numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>

      {signedIn ? (
        <Button
          label={editLabel}
          tone="glass"
          full={false}
          icon={<PencilGlyph color="text" size={16} />}
          onPress={onEdit}
        />
      ) : signIn ? (
        <View style={styles.signIn}>
          <Button label={signIn.label} onPress={signIn.onPress} tall />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  text: { alignItems: 'center', gap: Spacing.one, alignSelf: 'stretch' },
  // A disc of the page ground, so the crest reads as sitting ON the avatar's
  // edge rather than floating over the scene behind it.
  badge: {
    width: Size.avatarBadge,
    height: Size.avatarBadge,
    borderRadius: Size.avatarBadge / 2,
    backgroundColor: Colors.dark.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signIn: { alignSelf: 'stretch' },
});
