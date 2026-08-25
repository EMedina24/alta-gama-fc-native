/**
 * The full club list with follow chips.
 *
 * ⚠ Tapping the ROW opens the club; tapping the CHIP follows in place. Two
 * targets, two outcomes — the design is explicit that opening a club does not
 * follow it.
 *
 * ⚠ A club with `lastSyncedAt === null` is opponent-only: only the matches where
 * it happened to face a tracked club were ever fetched. Its subtitle says the
 * schedule is pending rather than claiming a fixture count.
 */
import { StyleSheet, View } from 'react-native';

import { ChipButton, Switch } from '@/components/atoms';
import { ListRow } from '@/components/molecules';
import { Size, Spacing } from '@/constants/theme';
import { abbreviate, crestSrc, displayName, hasCompleteSchedule } from '@/lib/cronogol/derive';
import type { TeamView } from '@/lib/cronogol/types';

export interface ClubBrowserProps {
  teams: readonly TeamView[];
  followed: readonly string[];
  onToggle: (slug: string) => void;
  onOpen: (slug: string) => void;
  /** Rendered as a switch row rather than a follow chip. */
  variant?: 'browse' | 'subscribed';
  copy: {
    follow: string;
    schedulePending: string;
    fullSeason: (n: number) => string;
  };
}

export function ClubBrowser({
  teams,
  followed,
  onToggle,
  onOpen,
  variant = 'browse',
  copy,
}: ClubBrowserProps) {
  return (
    <View>
      {teams.map((team) => {
        const isFollowed = followed.includes(team.slug);
        const pending = !hasCompleteSchedule(team);

        return (
          <ListRow
            key={team.slug}
            title={displayName(team.name)}
            subtitle={pending ? copy.schedulePending : null}
            crest={crestSrc(team.logoUrls, team.logoUrl, 'small')}
            abbr={abbreviate(team.name, team.slug, team.shortName)}
            crestSize={variant === 'subscribed' ? Size.crestCard : Size.crestList}
            active={variant === 'subscribed'}
            onPress={() => onOpen(team.slug)}
            trailing={
              variant === 'subscribed' ? (
                <Switch
                  value={isFollowed}
                  onValueChange={() => onToggle(team.slug)}
                  accessibilityLabel={team.name}
                />
              ) : isFollowed ? (
                <ChipButton label="✓" active onPress={() => onToggle(team.slug)} />
              ) : (
                <ChipButton label={copy.follow} onPress={() => onToggle(team.slug)} />
              )
            }
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({});
